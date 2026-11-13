import { Mesh, MeshBuilder, Scene, Vector3, StandardMaterial, Color3, AbstractMesh } from "@babylonjs/core";
import { getWeapon } from "../entities/guns";

export class Projectile {
    private speed = 300;
    private lifeTime = 2;
    private elapsed = 0;
    private direction: Vector3;
    private damage: number;
    public pierceCount: number = 0;
    private hitEnemies: Set<string> = new Set();
    private static projectileBases: { [key: string]: Mesh } = {};
    private radius: number;
    
    private static materialCache: { [weaponId: string]: StandardMaterial } = {};

    private static getOrCreateMaterial(scene: Scene, weaponId: string, color: Color3): StandardMaterial {
        if (!Projectile.materialCache[weaponId]) {
            const mat = new StandardMaterial(`mat_projectile_${weaponId}`, scene);
            mat.diffuseColor = new Color3(0, 0, 0);
            mat.emissiveColor = color;
            mat.disableLighting = true;
            Projectile.materialCache[weaponId] = mat;
        }
        return Projectile.materialCache[weaponId];
    }

    public constructor(
        public mesh: AbstractMesh,
        direction: Vector3,
        damage: number,
        radius: number
    ) {
        this.direction = direction.normalizeToNew();
        this.damage = damage;
        this.radius = radius;
    }

    public static createSpread(scene: Scene, posicaoInicial: Vector3, direction: Vector3, weaponId: string = "default"): Projectile[] {
        const playerMesh = scene.meshes.find(m => m.metadata?.playerComponent);
        const playerStats = playerMesh?.metadata?.playerComponent?.statsP;
        const playerDmg = playerStats?.dmg ?? 1;
            
        const weapon = getWeapon(weaponId);

        let count = weapon.projectileCount;
        let pierce = weapon.pierceCount;
        let dmgMultiplier = weapon.damageMultiplier;
        let spread = weapon.spreadAngle;
        let diameter = weapon.diameter;
        
        
        if (weaponId === "shotgun") {
            count += playerStats?.shotgunBonusProjectiles ?? 0;
            spread += playerStats?.shotgunBonusSpread ?? 0;
        }
        if (weaponId === "plasma_cannon") {
            pierce += playerStats?.plasmaBonusPierce ?? 0;
            diameter += playerStats?.plasmaBonusSize ?? 0;
        }
        if (weaponId === "default") {
            dmgMultiplier += (playerStats?.defaultBonusDmg ?? 0) / (playerDmg || 1);
        }
        const meshKey = `${weaponId}_${diameter}`;
        let base = Projectile.projectileBases[meshKey];

        if (!base) {
            base = MeshBuilder.CreateSphere(
                `ProjectileBase_${meshKey}`,
                { diameter },
                scene
            );

            base.material = Projectile.getOrCreateMaterial(
                scene,
                weaponId,
                weapon.color
            );

            base.setEnabled(false);
            base.isPickable = false;
            base.doNotSyncBoundingInfo = true;

            Projectile.projectileBases[meshKey] = base;
        }
        
        const finalDamage = Math.max(1, Math.floor(playerDmg * dmgMultiplier));
        const projectiles: Projectile[] = [];
        
        for (let i = 0; i < count; i++) {
            const angleOffset = count === 1 ? 0 : -spread / 2 + (spread / (count - 1)) * i;
            const radians = (angleOffset * Math.PI) / 180;

            const spreadDir = new Vector3(
                direction.x * Math.cos(radians) - direction.z * Math.sin(radians),
                direction.y,
                direction.x * Math.sin(radians) + direction.z * Math.cos(radians)
            );
            const projectileMesh = base.createInstance("Projectile");
            projectileMesh.position = posicaoInicial.clone();

            const p = new Projectile(
                projectileMesh,
                spreadDir,
                finalDamage,
                diameter / 2
            );
            p.pierceCount = pierce;
            projectiles.push(p);
        }

        return projectiles;
    }

    public static create(scene: Scene, posicaoInicial: Vector3, direction: Vector3, weaponId: string = "default"): Projectile {
        return Projectile.createSpread(scene, posicaoInicial, direction, weaponId)[0];
    }

    private checkEnemyCollisions(enemies: AbstractMesh[]): boolean {

        for (const enemy of enemies) {

            if (enemy.isDisposed())
                continue;

            if (this.hitEnemies.has(enemy.uniqueId.toString()))
                continue;

            const dx = this.mesh.position.x - enemy.position.x;
            const dz = this.mesh.position.z - enemy.position.z;
            const enemyRadius =
                (enemy.metadata?.initialStats?.size ?? 40) / 2;         
            const radius = enemyRadius + this.radius;

            if (dx * dx + dz * dz > 250 * 250)
                continue;

            if (dx * dx + dz * dz > radius * radius)
                continue;

            this.hitEnemies.add(enemy.uniqueId.toString());

            const enemyComponent = enemy.metadata?.enemyIAComponent;

            if (enemyComponent && typeof enemyComponent.takedmg === "function") {
                enemyComponent.takedmg(this.damage, true);
            }

            if (this.pierceCount > 0) {
                this.pierceCount--;
                return false;
            }

            this.mesh.dispose();
            return true;
        }

        return false;
    }

    public update(enemies: AbstractMesh[]): boolean {
        if (this.mesh.isDisposed()) return false;

        const dt = this.mesh.getScene().getEngine().getDeltaTime() / 1000;
        this.mesh.position.addInPlace(this.direction.scale(this.speed * dt));

        if (this.checkEnemyCollisions(enemies))
            return false;

        this.elapsed += dt;

        if (this.elapsed >= this.lifeTime) {
            this.mesh.dispose();
            return false;
        }

        return true;
    }
}