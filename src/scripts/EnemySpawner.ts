import { Mesh, MeshBuilder} from "@babylonjs/core/Meshes";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { IScript, applyScriptOnObject } from "babylonjs-editor-tools";
import EnemyIA from "./EnemyIA";
import { ENEMIES } from "../entities/enemy";
import { GameState } from "../gameState";
import {AdvancedDynamicTexture, Rectangle} from "@babylonjs/gui";
export default class EnemySpawner implements IScript {

    private spawnCooldown = 3000;
    private timeSinceLastSpawn = 0;
    private minSpawnRadius = 500;
    private maxSpawnRadius = 1000;
    public static enemies: Mesh[] = [];
    private gameTime = 0;


    public constructor(public mesh: Mesh) {}

    public onStart(): void {}

    public async onUpdate(): Promise<void> {
        if (GameState.isPaused || GameState.isGameOver) return;

        const dt = this.mesh.getScene().getEngine().getDeltaTime();

        this.timeSinceLastSpawn += dt;
        this.gameTime += dt;

        if (this.timeSinceLastSpawn >= this.spawnCooldown) {
            this.timeSinceLastSpawn = 0;
            await this.spawnEnemy();
        }
    }

    private getEnemyMultiplier() {
        const minutes = this.gameTime / 60000;

        return {
            hp: 1 + minutes * 1,
            xp: 1 + minutes * 2,
            speed: 1 + minutes * 0.2
        };
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
        const mult = this.getEnemyMultiplier();

        const scaledSize = stats.size;

        const enemyMesh = MeshBuilder.CreateBox("Enemy", { size: scaledSize }, this.mesh.getScene());
        EnemySpawner.enemies.push(enemyMesh);
        const groundY = this.mesh.position.y;
        const spawnPosition = this.mesh.position.add(new Vector3(offsetX, 0, offsetZ));
        spawnPosition.y = groundY + (scaledSize / 2);
        enemyMesh.position = spawnPosition;
        if (stats.texture) {
            const mat = new StandardMaterial(`mat_${enemyType}_${enemyMesh.uniqueId}`, this.mesh.getScene());
            mat.diffuseTexture = new Texture(stats.texture, this.mesh.getScene());
            enemyMesh.material = mat;
        }

        enemyMesh.metadata = enemyMesh.metadata ?? {};
        const scaledStats = {
            ...stats,
            hp: Math.round(stats.hp * mult.hp),
            maxHp: Math.round(stats.maxHp * mult.hp),
            xpDrop: Math.round(stats.xpDrop * mult.xp),
        };

        enemyMesh.metadata.initialStats = scaledStats;

        await applyScriptOnObject(enemyMesh, EnemyIA);
    }

}