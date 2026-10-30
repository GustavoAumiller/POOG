import { Color3 } from "@babylonjs/core/Maths/math.color";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";

// Altere esta paleta para criar variações sem precisar de texturas externas.
export const ROBOT_COLORS = {
    armor: "#E98938",
    dark: "#263344",
    joints: "#101A26",
    trim: "#DCE6EB",
    light: "#51E5EF",
};

/** Modelo visual: o Player original continua responsável por colisões e movimento. */
export class PlayerModel {
    public readonly root: TransformNode;
    private readonly scene: Scene;
    private readonly materials: PBRMaterial[] = [];
    private readonly parts: Mesh[] = [];
    private readonly originalShadowCasters: ShadowGenerator[] = [];
    private readonly torso: TransformNode;
    private readonly leftLeg: TransformNode;
    private readonly rightLeg: TransformNode;
    private readonly leftArm: TransformNode;
    private readonly rightArm: TransformNode;
    private readonly originalVisibility: boolean;
    private elapsed = 0;
    private stride = 0;
    private walkBlend = 0;
    private disposed = false;

    public constructor(private readonly player: Mesh) {
        this.scene = player.getScene();
        this.originalVisibility = player.isVisible;
        this.root = new TransformNode("robot", this.scene);
        this.root.parent = player;

        // O modelo é desenhado em 100 unidades e ajustado à caixa local do Player.
        const bounds = player.getBoundingInfo().boundingBox;
        this.root.position.copyFrom(bounds.center);
        const size = bounds.maximum.subtract(bounds.minimum);
        this.root.scaling.copyFrom(size.scale(1 / 100));

        const armor = this.material("armor", ROBOT_COLORS.armor);
        const dark = this.material("dark", ROBOT_COLORS.dark);
        const joints = this.material("joints", ROBOT_COLORS.joints);
        const trim = this.material("trim", ROBOT_COLORS.trim);
        const light = this.material("light", ROBOT_COLORS.light, true);

        this.torso = this.pivot("torso", this.root, 0, 0, 0);
        this.box("chest", this.torso, [42, 32, 24], [0, 8, 0], armor);
        this.box("chest-inset", this.torso, [30, 19, 3], [0, 10, 13], dark);
        this.box("reactor", this.torso, [8, 10, 2], [0, 11, 15], light);
        this.box("chest-stripe-left", this.torso, [6, 3, 2], [-11, 15, 15], trim);
        this.box("chest-stripe-right", this.torso, [6, 3, 2], [11, 15, 15], trim);
        this.box("belt", this.torso, [34, 10, 22], [0, -9, 0], dark);
        this.box("belt-buckle", this.torso, [8, 6, 3], [0, -9, 12], trim);
        this.box("backpack", this.torso, [26, 27, 12], [0, 8, -17], dark);
        for (const x of [-7, 7]) {
            this.box(`backpack-light-${x}`, this.torso, [4, 16, 2], [x, 8, -24], light);
        }

        this.cylinder("neck", this.torso, 6, 12, [0, 26, 0], joints);
        this.box("helmet", this.torso, [30, 20, 25], [0, 37, 0], armor);
        this.box("visor-frame", this.torso, [26, 11, 3], [0, 38, 13], joints);
        this.box("visor", this.torso, [22, 5, 2], [0, 39, 15], light);
        this.box("chin", this.torso, [14, 4, 3], [0, 30, 13], trim);
        for (const side of [-1, 1]) {
            this.cylinder(`ear-${side}`, this.torso, 5, 10, [side * 17, 37, 0], dark)
                .rotation.z = Math.PI / 2;
        }

        this.leftLeg = this.createLeg("left", -11, armor, dark, joints);
        this.rightLeg = this.createLeg("right", 11, armor, dark, joints);
        this.leftArm = this.createArm("left", -29, armor, dark, joints, trim);
        this.rightArm = this.createArm("right", 29, armor, dark, joints, trim);

        // A frente do personagem e o cano da arma apontam para +Z.
        this.box("blaster", this.rightArm, [12, 12, 27], [0, -28, 18], dark);
        this.box("blaster-cover", this.rightArm, [14, 5, 18], [0, -20, 17], armor);
        const barrel = this.cylinder("barrel", this.rightArm, 12, 8, [0, -28, 36], trim);
        barrel.rotation.x = Math.PI / 2;
        const muzzle = this.cylinder("muzzle", this.rightArm, 2, 5, [0, -28, 43], light);
        muzzle.rotation.x = Math.PI / 2;

        // isVisible oculta apenas o cubo; setEnabled(false) desativaria os scripts e filhos.
        player.isVisible = false;
        for (const sceneLight of this.scene.lights) {
            const shadows = sceneLight.getShadowGenerator();
            if (shadows instanceof ShadowGenerator) {
                if (shadows.getShadowMap()?.renderList?.includes(player)) {
                    this.originalShadowCasters.push(shadows);
                    shadows.removeShadowCaster(player, false);
                }
                for (const part of this.parts) shadows.addShadowCaster(part, false);
            }
        }
        player.onDisposeObservable.addOnce(() => this.dispose());
    }

    private material(name: string, hex: string, emissive = false): PBRMaterial {
        const material = new PBRMaterial(`robot-${name}`, this.scene);
        const color = Color3.FromHexString(hex).toLinearSpace();
        material.albedoColor = color;
        material.metallic = 0.25;
        material.roughness = 0.7;
        if (emissive) {
            material.emissiveColor = color;
            material.unlit = true;
        }
        this.materials.push(material);
        return material;
    }

    private pivot(name: string, parent: TransformNode, x: number, y: number, z: number): TransformNode {
        const node = new TransformNode(`robot-${name}`, this.scene);
        node.parent = parent;
        node.position.set(x, y, z);
        return node;
    }

    private finishPart(mesh: Mesh, parent: TransformNode, position: number[], material: PBRMaterial): Mesh {
        mesh.parent = parent;
        mesh.position.set(position[0], position[1], position[2]);
        mesh.material = material;
        mesh.isPickable = false;
        mesh.checkCollisions = false;
        mesh.receiveShadows = true;
        this.parts.push(mesh);
        return mesh;
    }

    private box(name: string, parent: TransformNode, size: number[], position: number[], material: PBRMaterial): Mesh {
        const mesh = MeshBuilder.CreateBox(`robot-${name}`, {
            width: size[0], height: size[1], depth: size[2],
        }, this.scene);
        return this.finishPart(mesh, parent, position, material);
    }

    private cylinder(name: string, parent: TransformNode, height: number, diameter: number, position: number[], material: PBRMaterial): Mesh {
        const mesh = MeshBuilder.CreateCylinder(`robot-${name}`, {
            height, diameter, tessellation: 8,
        }, this.scene);
        return this.finishPart(mesh, parent, position, material);
    }

    private createLeg(name: string, x: number, armor: PBRMaterial, dark: PBRMaterial, joints: PBRMaterial): TransformNode {
        const leg = this.pivot(`${name}-leg`, this.root, x, -9, 0);
        this.box(`${name}-thigh`, leg, [14, 19, 16], [0, -10, 0], dark);
        this.cylinder(`${name}-knee`, leg, 15, 10, [0, -20, 0], joints)
            .rotation.z = Math.PI / 2;
        this.box(`${name}-shin`, leg, [15, 16, 18], [0, -26, 1], armor);
        this.box(`${name}-boot`, leg, [18, 12, 26], [0, -35, 4], dark);
        return leg;
    }

    private createArm(name: string, x: number, armor: PBRMaterial, dark: PBRMaterial, joints: PBRMaterial, trim: PBRMaterial): TransformNode {
        const arm = this.pivot(`${name}-arm`, this.torso, x, 13, 0);
        this.box(`${name}-shoulder`, arm, [16, 15, 23], [0, 3, 0], armor);
        this.box(`${name}-shoulder-stripe`, arm, [17, 3, 17], [0, 5, 0], trim);
        this.box(`${name}-upper-arm`, arm, [10, 17, 12], [0, -10, 0], dark);
        this.cylinder(`${name}-elbow`, arm, 12, 9, [0, -19, 0], joints)
            .rotation.z = Math.PI / 2;
        this.box(`${name}-forearm`, arm, [13, 13, 15], [0, -26, 1], armor);
        this.box(`${name}-hand`, arm, [10, 7, 11], [0, -35, 2], dark);
        return arm;
    }

    /** distance é o deslocamento real neste frame, após a resolução das colisões. */
    public update(deltaSeconds: number, distance: number): void {
        if (this.disposed) return;
        const dt = Math.min(Math.max(deltaSeconds, 0), 0.1);
        this.elapsed += dt;
        this.walkBlend += ((distance > 0.001 ? 1 : 0) - this.walkBlend) * (1 - Math.exp(-12 * dt));
        this.stride = (this.stride + distance * Math.PI / 45) % (Math.PI * 2);
        const swing = Math.sin(this.stride) * this.walkBlend;
        this.leftLeg.rotation.x = swing * 0.45;
        this.rightLeg.rotation.x = -swing * 0.45;
        this.leftArm.rotation.x = -swing * 0.3;
        this.rightArm.rotation.x = swing * 0.08;
        this.torso.position.y = Math.sin(this.elapsed * 2) * 0.4 * (1 - this.walkBlend);
    }

    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        for (const sceneLight of this.scene.lights) {
            const shadows = sceneLight.getShadowGenerator();
            if (shadows instanceof ShadowGenerator) {
                for (const part of this.parts) shadows.removeShadowCaster(part, false);
            }
        }
        this.root.dispose();
        for (const material of this.materials) material.dispose();
        if (!this.player.isDisposed()) {
            this.player.isVisible = this.originalVisibility;
            for (const shadows of this.originalShadowCasters) shadows.addShadowCaster(this.player, false);
        }
    }
}
