import { Mesh, MeshBuilder, Scene, Vector3 } from "@babylonjs/core";

export class Projectile {
    private speed = 300; // ajustei pra um valor mais razoável, veja a nota no final
    private lifeTime = 2;
    private elapsed = 0;
    private direction: Vector3;

    public constructor(public mesh: Mesh, direction: Vector3) {
        this.direction = direction.normalizeToNew(); // garante magnitude 1, só direção
    }

    public static create(scene: Scene, posicaoInicial: Vector3, direction: Vector3): Projectile {
        const mesh = MeshBuilder.CreateSphere("Projectile", { diameter: 20 }, scene);
        mesh.position = posicaoInicial.clone();
        return new Projectile(mesh, direction);
    }

    public update(): boolean {
        const dt = this.mesh.getScene().getEngine().getDeltaTime() / 1000;

        this.mesh.position.addInPlace(this.direction.scale(this.speed * dt));

        this.elapsed += dt;
        if (this.elapsed >= this.lifeTime) {
            this.mesh.dispose();
            return false;
        }
        return true;
    }
}