import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { IScript } from "babylonjs-editor-tools";
import { ENEMIES, EnemyStats, getDamageMultiplier } from "../entities/enemy";
import { GameState } from "../gameState";
import EnemySpawner from "./EnemySpawner";
import {AdvancedDynamicTexture, Rectangle} from "@babylonjs/gui";
import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

const playerCache = new WeakMap<Scene, AbstractMesh>();

function getPlayer(scene: Scene): AbstractMesh | null {
    let player = playerCache.get(scene);

    if (!player || player.isDisposed()) {
        const foundPlayer = scene.getMeshByName("Player");

        if (!foundPlayer) {
            return null;
        }

        player = foundPlayer;
        playerCache.set(scene, player);
    }

    return player;
}
const playerExtentCache = new WeakMap<Scene, number>();

function getPlayerExtent(scene: Scene, player: AbstractMesh): number {
    let extent = playerExtentCache.get(scene);

    if (extent === undefined) {
        player.computeWorldMatrix(true);

        extent = player.getBoundingInfo().boundingBox.extendSizeWorld.x;

        playerExtentCache.set(scene, extent);
    }

    return extent;
}

const enemyHealthUIs = new WeakMap<Scene, AdvancedDynamicTexture>();

function getEnemyHealthUI(scene: Scene): AdvancedDynamicTexture {
    let ui = enemyHealthUIs.get(scene);

    if (!ui) {
        ui = AdvancedDynamicTexture.CreateFullscreenUI(
            "EnemyHealthUI",
            true,
            scene,
        );

        enemyHealthUIs.set(scene, ui);

        scene.onDisposeObservable.addOnce(() => {
            ui?.dispose();
            enemyHealthUIs.delete(scene);
        });
    }

    return ui;
}
export default class EnemyIA implements IScript {

    private stats: EnemyStats = { ...ENEMIES.slime };
    private lastContactDamageTime = 0;
    private contactDamageCooldown = 1000;
    private dead = false;
    private enemyExtentX = 0;
    private movementDirection = Vector3.Zero();
    private hpBg!: Rectangle;
    private hpBar!: Rectangle;

    public constructor(public mesh: Mesh) {}

    public onStart(): void {
        this.mesh.metadata = this.mesh.metadata ?? {};
        this.mesh.metadata.enemyIAComponent = this;

        const customStats = this.mesh.metadata?.initialStats as EnemyStats | undefined;
        if (customStats) {
            this.stats = { ...customStats };
        }
        this.mesh.computeWorldMatrix(true);

        this.enemyExtentX =
            this.mesh.getBoundingInfo().boundingBox.extendSizeWorld.x;
        const ui = getEnemyHealthUI(this.mesh.getScene());

        this.hpBg = new Rectangle();
        this.hpBg.width = "115px";
        this.hpBg.height = "10px";
        this.hpBg.thickness = 0;
        this.hpBg.color = "black";
        this.hpBg.background = "black";


        ui.addControl(this.hpBg);

        this.hpBar = new Rectangle();

        this.hpBg.addControl(this.hpBar);

        this.hpBar.width = "100%";
        this.hpBar.height = "100%";
        this.hpBar.thickness = 0;
        this.hpBar.background = "red";
        this.hpBar.horizontalAlignment = Rectangle.HORIZONTAL_ALIGNMENT_LEFT;

        this.hpBg.linkWithMesh(this.mesh);
        this.hpBg.linkOffsetY = -20;
    }

    public takedmg(amount: number, fromProjectile: boolean = false): void {

        if (this.dead || this.mesh.isDisposed()) {
            return;
        }

        if (!fromProjectile) {
            const now = Date.now();
            if (now - this.lastContactDamageTime < this.contactDamageCooldown) return;
            this.lastContactDamageTime = now;
        }

        const multiplier = fromProjectile ? getDamageMultiplier(this.stats.type) : 1;
        const finalDamage = amount * multiplier;


        this.stats.hp -= finalDamage;

        const percent = this.stats.hp / this.stats.maxHp;

        this.hpBar.width = `${percent * 100}%`;

        if (this.stats.hp <= 0) {
            this.dead = true;
            const index = EnemySpawner.enemies.indexOf(this.mesh);
            const player = getPlayer(this.mesh.getScene());
            const playerComponent = player?.metadata?.playerComponent;

            if (playerComponent && typeof playerComponent.addXp === "function") {
                playerComponent?.addXp(this.stats.xpDrop);
            }
            if (index !== -1) {
                EnemySpawner.enemies.splice(index, 1);
            }
            this.hpBg.dispose();
            this.mesh.dispose();
        }
    }


    public onUpdate(): void {
        if (this.dead || this.mesh.isDisposed()) {
            return;
        }

        if (GameState.isPaused || GameState.isGameOver) return;

        const scene = this.mesh.getScene();
        const player = getPlayer(scene);

        if (!player) return;

        if (this.mesh.intersectsMesh(player, false)) {
            this.takedmg(1, false);
        }

        const dx = player.position.x - this.mesh.position.x;
        const dz = player.position.z - this.mesh.position.z;

        const distanceSquared = dx * dx + dz * dz;

        const playerExtentX = getPlayerExtent(scene, player);
        const stopDistance = this.enemyExtentX + playerExtentX;

        if (distanceSquared > stopDistance * stopDistance) {
            const distance = Math.sqrt(distanceSquared);

            this.movementDirection.set(
                (dx / distance) * this.stats.speed,
                0,
                (dz / distance) * this.stats.speed
            );

            this.mesh.moveWithCollisions(this.movementDirection);
        }
    }

}