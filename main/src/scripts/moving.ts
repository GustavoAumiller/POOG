import { KeyboardEventTypes, Vector3, Mesh, AbstractMesh } from "@babylonjs/core";
import { IScript } from "babylonjs-editor-tools";
import { Projectile } from "./projectile";
import {PLAYER} from "../entities/player"

const inputMap: { [key: string]: boolean } = {};

export default class SceneComponent implements IScript {
	public statsP = PLAYER.player1;
	private speed = 5;
	private canShoot = true;
	private projectiles: Projectile[] = [];
	private timeSinceLastShot = 0;
	private fireCooldown = 1000/this.statsP.atkspeed;


	public addXp(amount: number): void {
		this.statsP.xp += amount;
		console.log(`+${amount} XP (${this.statsP.xp}/${this.statsP.xpToNextLevel})`);

		if (this.statsP.xp >= this.statsP.xpToNextLevel) {
			this.levelUp();
		}
	}

	private levelUp(): void {
		this.statsP.xp -= this.statsP.xpToNextLevel;
		this.statsP.level += 1;
		this.statsP.xpToNextLevel = Math.floor(this.statsP.xpToNextLevel * 1.5);

		console.log(`🎉 Nível ${this.statsP.level}! Próximo: ${this.statsP.xpToNextLevel} XP`);

		if (this.statsP.xp >= this.statsP.xpToNextLevel) {
			this.levelUp(); // cobre o caso de XP excedente subir mais de um nível
		}
	}


	public constructor(public mesh: Mesh) {}

	public onStart(): void {
		
		this.mesh.metadata = this.mesh.metadata ?? {};
    	this.mesh.metadata.playerComponent = this;

		this.mesh.getScene().onKeyboardObservable.add((kbInfo) => {
			const key = kbInfo.event.code;
			if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
				inputMap[key] = true;
			}
			if (kbInfo.type === KeyboardEventTypes.KEYUP) {
				inputMap[key] = false;
			}
		});
	}
		private findClosestEnemy(): AbstractMesh | null {
		const enemies = this.mesh.getScene().meshes.filter(m => m.name === "Enemy");

		if (enemies.length === 0) {
			return null;
		}

		let closest: AbstractMesh = enemies[0];
		let closestDist = Vector3.Distance(this.mesh.position, closest.position);

		for (const enemy of enemies) {
			const dist = Vector3.Distance(this.mesh.position, enemy.position);
			if (dist < closestDist) {
				closest = enemy;
				closestDist = dist;
			}
		}

		return closest;
	}

	public onUpdate(): void {
		const dt = this.mesh.getScene().getEngine().getDeltaTime();
		this.timeSinceLastShot += dt;

		if (this.timeSinceLastShot >= this.fireCooldown) {
			const target = this.findClosestEnemy();

			if (target) {
				const direction = target.position.subtract(this.mesh.position);
				direction.y = 0; 

				const projectile = Projectile.create(this.mesh.getScene(), this.mesh.position, direction);
				this.projectiles.push(projectile);
			}

			this.timeSinceLastShot = 0;
		}
		this.projectiles = this.projectiles.filter(p => p.update());

		if (inputMap["ArrowUp"]) {
			this.mesh.moveWithCollisions(new Vector3(0, 0, this.speed));
		}
		if (inputMap["ArrowDown"]) {
			this.mesh.moveWithCollisions(new Vector3(0, 0, -this.speed));
		}
		if (inputMap["ArrowLeft"]) {
			this.mesh.moveWithCollisions(new Vector3(-this.speed, 0, 0));
		}
		if (inputMap["ArrowRight"]) {
			this.mesh.moveWithCollisions(new Vector3(this.speed, 0, 0));
		}
	}
}