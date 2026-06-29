import { Mesh, MeshBuilder } from "@babylonjs/core/Meshes";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { IScript, applyScriptOnObject } from "babylonjs-editor-tools";
import EnemyIA from "./EnemyIA";
import { ENEMIES } from "../entities/enemy";

export default class EnemySpawner implements IScript {

    private spawnCooldown = 3000;
    private timeSinceLastSpawn = 0;
    private minSpawnRadius = 500;
    private maxSpawnRadius = 1000;

    public constructor(public mesh: Mesh) {}

    public onStart(): void {}

    public async onUpdate(): Promise<void> {
        const dt = this.mesh.getScene().getEngine().getDeltaTime();
        this.timeSinceLastSpawn += dt;

        if (this.timeSinceLastSpawn >= this.spawnCooldown) {
            this.timeSinceLastSpawn = 0;
            await this.spawnEnemy();
        }
    }

    private getRandomEnemyType(): keyof typeof ENEMIES {
        const keys = Object.keys(ENEMIES) as (keyof typeof ENEMIES)[];
        const randomIndex = Math.floor(Math.random() * keys.length);
        return keys[randomIndex];
    }

    private async spawnEnemy(): Promise<void> {
        const angle = Math.random() * Math.PI * 2;
        const radius = this.minSpawnRadius + Math.random() * (this.maxSpawnRadius - this.minSpawnRadius);

        const offsetX = Math.cos(angle) * radius;
        const offsetZ = Math.sin(angle) * radius;

        const enemyType = this.getRandomEnemyType();
        const stats = ENEMIES[enemyType];

        const scaledSize = stats.size;

        const enemyMesh = MeshBuilder.CreateBox("Enemy", { size: scaledSize }, this.mesh.getScene());

        // ajusta o Y pra base do mesh ficar no mesmo nível do chão, não o centro
        const groundY = this.mesh.position.y; // assume que o player já está no nível correto do chão
        const spawnPosition = this.mesh.position.add(new Vector3(offsetX, 0, offsetZ));
        spawnPosition.y = groundY + (scaledSize / 2);

        enemyMesh.position = spawnPosition;

        enemyMesh.metadata = enemyMesh.metadata ?? {};
        enemyMesh.metadata.initialStats = stats;

        await applyScriptOnObject(enemyMesh, EnemyIA);

        console.log(`inimigo "${enemyType}" spawnado em`, spawnPosition);
    }

}