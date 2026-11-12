
import {
    Mesh,
    MeshBuilder,
    Scene,
    Vector3,
    StandardMaterial,
    Color3,
    AbstractMesh,
} from "@babylonjs/core";

import { getWeapon } from "../entities/guns";

type ProjectileGrid = {
    cells: Map<string, AbstractMesh[]>;
    buckets: AbstractMesh[][];
    usedBuckets: number;
};

export class Projectile {
    private speed = 300;
    private lifeTime = 2;
    private elapsed = 0;

    private direction: Vector3;
    private damage: number;
    private radius: number;

    public pierceCount = 0;

    private hitEnemies: Set<number> = new Set();

    // Pools e caches separados por cena.
    private static projectilePools = new WeakMap<
        Scene,
        Map<string, AbstractMesh[]>
    >();

    private static projectileBases = new WeakMap<
        Scene,
        Map<string, Mesh>
    >();

    private static materialCache = new WeakMap<
        Scene,
        Map<string, StandardMaterial>
    >();

    private static projectileGrids = new WeakMap<
        Scene,
        ProjectileGrid
    >();

    // =========================================================
    // GRADE ESPACIAL
    // =========================================================

    private static getOrCreateGrid(scene: Scene): ProjectileGrid {
        let grid = this.projectileGrids.get(scene);

        if (!grid) {
            grid = {
                cells: new Map(),
                buckets: [],
                usedBuckets: 0,
            };

            this.projectileGrids.set(scene, grid);
        }

        return grid;
    }

    // =========================================================
    // POOL DE MALHAS
    // =========================================================

    private static getOrCreatePool(
        scene: Scene,
        meshKey: string
    ): AbstractMesh[] {
        let pools = this.projectilePools.get(scene);

        if (!pools) {
            pools = new Map();
            this.projectilePools.set(scene, pools);
        }

        let pool = pools.get(meshKey);

        if (!pool) {
            pool = [];
            pools.set(meshKey, pool);
        }

        return pool;
    }

    private static acquireMesh(
        scene: Scene,
        base: Mesh,
        meshKey: string,
        position: Vector3
    ): AbstractMesh {
        const pool = this.getOrCreatePool(scene, meshKey);

        let mesh = pool.pop();

        if (!mesh || mesh.isDisposed()) {
            mesh = base.createInstance("Projectile");
        }

        mesh.position.copyFrom(position);
        mesh.setEnabled(true);

        return mesh;
    }

    private releaseMesh(): void {
        if (this.mesh.isDisposed()) return;

        this.mesh.setEnabled(false);

        const pool = Projectile.getOrCreatePool(
            this.mesh.getScene(),
            this.poolKey
        );

        pool.push(this.mesh);
    }

    // =========================================================
    // CACHE DE MATERIAIS
    // =========================================================

    private static getOrCreateMaterial(
        scene: Scene,
        weaponId: string,
        color: Color3
    ): StandardMaterial {
        let materials = this.materialCache.get(scene);

        if (!materials) {
            materials = new Map();
            this.materialCache.set(scene, materials);
        }

        let material = materials.get(weaponId);

        if (!material) {
            material = new StandardMaterial(
                `mat_projectile_${weaponId}`,
                scene
            );

            material.diffuseColor = new Color3(0, 0, 0);
            material.emissiveColor = color;
            material.disableLighting = true;

            materials.set(weaponId, material);
        }

        return material;
    }

    // =========================================================
    // CONSTRUTOR
    // =========================================================

    public constructor(
        public mesh: AbstractMesh,
        direction: Vector3,
        damage: number,
        radius: number,
        private poolKey: string
    ) {
        this.direction = direction.normalizeToNew();
        this.damage = damage;
        this.radius = radius;
    }

    // =========================================================
    // ATUALIZAÇÃO COM GRADE ESPACIAL
    // =========================================================

    private updateFromGrid(
        grid: Map<string, AbstractMesh[]>,
        cellSize: number,
        searchRadius: number,
        dt: number
    ): boolean {
        if (this.mesh.isDisposed()) return false;

        // Atualiza a posição sem criar um novo Vector3.
        const movement = this.speed * dt;

        this.mesh.position.x += this.direction.x * movement;
        this.mesh.position.y += this.direction.y * movement;
        this.mesh.position.z += this.direction.z * movement;

        const position = this.mesh.position;

        const minX = Math.floor(
            (position.x - searchRadius) / cellSize
        );

        const maxX = Math.floor(
            (position.x + searchRadius) / cellSize
        );

        const minZ = Math.floor(
            (position.z - searchRadius) / cellSize
        );

        const maxZ = Math.floor(
            (position.z + searchRadius) / cellSize
        );

        let hitThisFrame = false;

        // Consulta somente as células próximas.
        for (let x = minX; x <= maxX && !hitThisFrame; x++) {
            for (let z = minZ; z <= maxZ; z++) {
                const cell = grid.get(`${x},${z}`);

                if (!cell) continue;

                const collision = this.checkEnemyCollisions(cell);

                // O projétil foi consumido.
                if (collision === 1) {
                    return false;
                }

                // O projétil perfurou um inimigo.
                // Interrompe a busca até o próximo quadro.
                if (collision === -1) {
                    hitThisFrame = true;
                    break;
                }
            }
        }

        this.elapsed += dt;

        if (this.elapsed >= this.lifeTime) {
            this.releaseMesh();
            return false;
        }

        return true;
    }

    // =========================================================
    // ATUALIZAÇÃO GERAL DOS PROJÉTEIS
    // =========================================================

    public static updateAll(
        projectiles: Projectile[],
        enemies: AbstractMesh[]
    ): Projectile[] {
        const cellSize = 125;
        const searchRadius = 250;

        // Encontra o primeiro projétil ainda válido para identificar a cena.
        let scene: Scene | null = null;

        for (const projectile of projectiles) {
            if (!projectile.mesh.isDisposed()) {
                scene = projectile.mesh.getScene();
                break;
            }
        }

        // Remove referências a projéteis já descartados.
        if (!scene) {
            projectiles.length = 0;
            return projectiles;
        }

        const grid = this.getOrCreateGrid(scene);

        // Reutiliza as estruturas da grade do quadro anterior.
        grid.cells.clear();
        grid.usedBuckets = 0;

        for (const bucket of grid.buckets) {
            bucket.length = 0;
        }

        // Distribui os inimigos pelas células.
        for (const enemy of enemies) {
            if (enemy.isDisposed()) continue;

            const cellX = Math.floor(
                enemy.position.x / cellSize
            );

            const cellZ = Math.floor(
                enemy.position.z / cellSize
            );

            const key = `${cellX},${cellZ}`;

            let cell = grid.cells.get(key);

            if (!cell) {
                cell = grid.buckets[grid.usedBuckets];

                if (!cell) {
                    cell = [];
                    grid.buckets.push(cell);
                }

                grid.usedBuckets++;
                grid.cells.set(key, cell);
            }

            cell.push(enemy);
        }

        // O delta time é calculado uma única vez por quadro.
        const dt = scene.getEngine().getDeltaTime() / 1000;

        // Compacta a própria lista, sem criar outro array.
        let writeIndex = 0;

        for (
            let readIndex = 0;
            readIndex < projectiles.length;
            readIndex++
        ) {
            const projectile = projectiles[readIndex];

            if (projectile.mesh.isDisposed()) continue;

            if (
                projectile.updateFromGrid(
                    grid.cells,
                    cellSize,
                    searchRadius,
                    dt
                )
            ) {
                projectiles[writeIndex++] = projectile;
            }
        }

        projectiles.length = writeIndex;

        return projectiles;
    }

    // =========================================================
    // CRIAÇÃO DOS PROJÉTEIS
    // =========================================================

    public static createSpread(
        scene: Scene,
        posicaoInicial: Vector3,
        direction: Vector3,
        weaponId: string = "default"
    ): Projectile[] {
        const playerMesh = scene.meshes.find(
            mesh => mesh.metadata?.playerComponent
        );

        const playerStats =
            playerMesh?.metadata?.playerComponent?.statsP;

        const playerDmg = playerStats?.dmg ?? 1;

        const weapon = getWeapon(weaponId);

        let count = weapon.projectileCount;
        let pierce = weapon.pierceCount;
        let dmgMultiplier = weapon.damageMultiplier;
        let spread = weapon.spreadAngle;
        let diameter = weapon.diameter;

        // Bônus da shotgun.
        if (weaponId === "shotgun") {
            count += playerStats?.shotgunBonusProjectiles ?? 0;
            spread += playerStats?.shotgunBonusSpread ?? 0;
        }

        // Bônus do canhão de plasma.
        if (weaponId === "plasma_cannon") {
            pierce += playerStats?.plasmaBonusPierce ?? 0;
            diameter += playerStats?.plasmaBonusSize ?? 0;
        }

        // Bônus da arma padrão.
        if (weaponId === "default") {
            dmgMultiplier +=
                (playerStats?.defaultBonusDmg ?? 0) /
                (playerDmg || 1);
        }

        const meshKey = `${weaponId}_${diameter}`;

        // Recupera ou cria o cache de malhas da cena.
        let bases = this.projectileBases.get(scene);

        if (!bases) {
            bases = new Map();
            this.projectileBases.set(scene, bases);
        }

        let base = bases.get(meshKey);

        // Cria a malha-base somente quando necessário.
        if (!base || base.isDisposed()) {
            base = MeshBuilder.CreateSphere(
                `ProjectileBase_${meshKey}`,
                { diameter },
                scene
            );

            base.material = this.getOrCreateMaterial(
                scene,
                weaponId,
                weapon.color
            );

            base.setEnabled(false);
            base.isPickable = false;
            base.doNotSyncBoundingInfo = true;

            bases.set(meshKey, base);
        }

        const finalDamage = Math.max(
            1,
            Math.floor(playerDmg * dmgMultiplier)
        );

        const projectiles: Projectile[] = [];

        for (let i = 0; i < count; i++) {
            const angleOffset =
                count === 1
                    ? 0
                    : -spread / 2 +
                      (spread / (count - 1)) * i;

            const radians = (angleOffset * Math.PI) / 180;

            const cos = Math.cos(radians);
            const sin = Math.sin(radians);

            const spreadDir = new Vector3(
                direction.x * cos - direction.z * sin,
                direction.y,
                direction.x * sin + direction.z * cos
            );

            const projectileMesh = this.acquireMesh(
                scene,
                base,
                meshKey,
                posicaoInicial
            );

            const projectile = new Projectile(
                projectileMesh,
                spreadDir,
                finalDamage,
                diameter / 2,
                meshKey
            );

            projectile.pierceCount = pierce;

            projectiles.push(projectile);
        }

        return projectiles;
    }

    public static create(
        scene: Scene,
        posicaoInicial: Vector3,
        direction: Vector3,
        weaponId: string = "default"
    ): Projectile {
        return Projectile.createSpread(
            scene,
            posicaoInicial,
            direction,
            weaponId
        )[0];
    }

    // =========================================================
    // COLISÃO COM INIMIGOS
    // =========================================================

    private checkEnemyCollisions(
        enemies: AbstractMesh[]
    ): -1 | 0 | 1 {
        for (const enemy of enemies) {
            if (enemy.isDisposed()) continue;

            if (this.hitEnemies.has(enemy.uniqueId)) continue;

            const dx = this.mesh.position.x - enemy.position.x;
            const dz = this.mesh.position.z - enemy.position.z;

            const distanceSquared = dx * dx + dz * dz;

            if (distanceSquared > 250 * 250) continue;

            const enemyRadius =
                (enemy.metadata?.initialStats?.size ?? 40) / 2;

            const radius = enemyRadius + this.radius;

            if (distanceSquared > radius * radius) continue;

            this.hitEnemies.add(enemy.uniqueId);

            const enemyComponent =
                enemy.metadata?.enemyIAComponent;

            if (
                enemyComponent &&
                typeof enemyComponent.takedmg === "function"
            ) {
                enemyComponent.takedmg(this.damage, true);
            }

            // Perfuração: mantém o projétil ativo.
            if (this.pierceCount > 0) {
                this.pierceCount--;
                return -1;
            }

            // Sem perfuração: devolve a malha ao pool.
            this.releaseMesh();

            return 1;
        }

        return 0;
    }

    // =========================================================
    // ATUALIZAÇÃO INDIVIDUAL
    // =========================================================

    public update(enemies: AbstractMesh[]): boolean {
        if (this.mesh.isDisposed()) return false;

        const dt =
            this.mesh.getScene().getEngine().getDeltaTime() / 1000;

        const movement = this.speed * dt;

        this.mesh.position.x += this.direction.x * movement;
        this.mesh.position.y += this.direction.y * movement;
        this.mesh.position.z += this.direction.z * movement;

        if (this.checkEnemyCollisions(enemies) === 1) {
            return false;
        }

        this.elapsed += dt;

        if (this.elapsed >= this.lifeTime) {
            this.releaseMesh();
            return false;
        }

        return true;
    }
}
