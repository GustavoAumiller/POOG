import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { IScript } from "babylonjs-editor-tools";
import { ENEMIES, EnemyStats, getDamageMultiplier } from "../entities/enemy";
import { GameState } from "../gameState";
import EnemySpawner from "./EnemySpawner";
import {AdvancedDynamicTexture, Rectangle} from "@babylonjs/gui";
export default class EnemyIA implements IScript {

    private stats: EnemyStats = { ...ENEMIES.slime };
    private lastContactDamageTime = 0;
    private contactDamageCooldown = 1000;
    private dead = false;
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
        const ui = AdvancedDynamicTexture.CreateFullscreenUI("UI");

        this.hpBg = new Rectangle();
        this.hpBg.width = "115px";
        this.hpBg.height = "10px";
        this.hpBg.thickness = 1.2;
        this.hpBg.color = "white";
        this.hpBg.background = "black";


        ui.addControl(this.hpBg);

        this.hpBar = new Rectangle();
        this.hpBar.width = "100%";
        this.hpBar.height = "100%";
        this.hpBar.thickness = 0;
        this.hpBar.background = "red";
        this.hpBar.horizontalAlignment = Rectangle.HORIZONTAL_ALIGNMENT_LEFT;

        this.hpBg.addControl(this.hpBar);

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
            const player = this.mesh.getScene().getMeshByName("Player");
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

        const player = this.mesh.getScene().getMeshByName("Player");
        if (!player) return;

        if (this.mesh.intersectsMesh(player, false)) {
            this.takedmg(1, false);
        }

        const direction = player.position.subtract(this.mesh.position);
        direction.y = 0;

        const distance = direction.length();

        const enemyExtent = this.mesh.getBoundingInfo().boundingBox.extendSizeWorld;
        const playerExtent = player.getBoundingInfo().boundingBox.extendSizeWorld;

        const stopDistance = enemyExtent.x + playerExtent.x;

        if (distance > stopDistance) {
            direction.normalize();
            this.mesh.moveWithCollisions(direction.scale(this.stats.speed));
        }
    }
}