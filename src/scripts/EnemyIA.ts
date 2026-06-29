import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { IScript, visibleAsNumber } from "babylonjs-editor-tools";
import { ENEMIES, EnemyStats } from "../entities/enemy";

export default class EnemyIA implements IScript {

    private stats: EnemyStats = { ...ENEMIES.slime };
    private lastDamageTime = 0;
    private damageCooldown = 500;

    public constructor(public mesh: Mesh) {}

    public onStart(): void {
        const customStats = this.mesh.metadata?.initialStats as EnemyStats | undefined;
        if (customStats) {
            this.stats = { ...customStats };
            console.log("stats customizados aplicados no onStart:", JSON.stringify(this.stats));
        } else {
            console.log("nenhum stat customizado encontrado, usando padrão slime");
        }
    }

    public takedmg(amount: number): void {
        const now = Date.now();
        if (now - this.lastDamageTime < this.damageCooldown) {
            return;
        }
        this.lastDamageTime = now;
        this.stats.hp -= amount;
        console.log("HP:", this.stats.hp, "| tipo:", this.stats.xpDrop);

        if (this.stats.hp <= 0) {
            console.log("inimigo morreu");

            const player = this.mesh.getScene().getMeshByName("Player");
            const playerComponent = player?.metadata?.playerComponent;

            if (playerComponent && typeof playerComponent.addXp === "function") {
                playerComponent.addXp(this.stats.xpDrop);
            }

            this.mesh.dispose();
        }
    }

    public onUpdate(): void {
        const player = this.mesh.getScene().getMeshByName("Player");
        const projectiles = this.mesh.getScene().meshes.filter(m => m.name === "Projectile");

        if (!player) {
            return;
        }
        if (this.mesh.intersectsMesh(player, false)) {
            this.takedmg(1);
        }

        for (const projectile of projectiles) {
            if (this.mesh.intersectsMesh(projectile, false)) {
                this.takedmg(1);
                break;
            }
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