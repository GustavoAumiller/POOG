import { KeyboardEventTypes, Vector3, Mesh, AbstractMesh } from "@babylonjs/core";
import { IScript } from "babylonjs-editor-tools";
import { Projectile } from "./projectile";
import { PLAYER } from "../entities/player";
import { GameState } from "../gameState";
import { getRandomUpgrades, Upgrade } from "../entities/upgrade";

const inputMap: { [key: string]: boolean } = {};

export default class SceneComponent implements IScript {
    public statsP = PLAYER.player1;
    private speed = this.statsP.speed;
    private projectiles: Projectile[] = [];
    private timeSinceLastShot = 0;
    private fireCooldown = 1000 / this.statsP.atkspeed;
    private lastDamageTime = 0;
    private damageCooldown = 1000;

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

        console.log(`🎉 Nível ${this.statsP.level}!`);

        GameState.isPaused = true;
        this.showUpgradeScreen();
    }

    private showUpgradeScreen(): void {
        const existing = document.getElementById("upgrade-screen");
        if (existing) return;

        const options = getRandomUpgrades(3);

        const screen = document.createElement("div");
        screen.id = "upgrade-screen";
        screen.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9997;
            font-family: sans-serif;
            color: white;
            gap: 1.5rem;
        `;

        const title = document.createElement("h1");
        title.textContent = `🎉 Nível ${this.statsP.level}! Escolha um upgrade:`;
        title.style.cssText = "font-size: 2rem; margin-bottom: 1rem;";
        screen.appendChild(title);

        const cardsContainer = document.createElement("div");
        cardsContainer.style.cssText = `
            display: flex;
            gap: 1.5rem;
            flex-wrap: wrap;
            justify-content: center;
        `;

        for (const upgrade of options) {
            const card = document.createElement("button");
            card.style.cssText = `
                background: #1a1a2e;
                border: 2px solid #e74c3c;
                border-radius: 12px;
                color: white;
                padding: 1.5rem 2rem;
                width: 200px;
                cursor: pointer;
                font-size: 1rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.75rem;
                transition: background 0.2s;
            `;

            card.innerHTML = `
                <span style="font-size: 1.4rem; font-weight: bold;">${upgrade.label}</span>
                <span style="font-size: 0.9rem; color: #aaa;">${upgrade.description}</span>
            `;

            card.addEventListener("mouseenter", () => {
                card.style.background = "#2d2d4e";
            });
            card.addEventListener("mouseleave", () => {
                card.style.background = "#1a1a2e";
            });

			card.addEventListener("click", () => {
				this.applyUpgrade(upgrade);
				screen.remove();
				setTimeout(() => {
					const canvas = this.mesh.getScene().getEngine().getRenderingCanvas();
					canvas?.focus();
				}, 50);

				if (this.statsP.xp >= this.statsP.xpToNextLevel) {
					this.levelUp();
				} else {
					GameState.isPaused = false;
				}
			});


            cardsContainer.appendChild(card);
        }

        screen.appendChild(cardsContainer);
        document.body.appendChild(screen);
    }

    private applyUpgrade(upgrade: Upgrade): void {
        upgrade.apply(this.statsP);

        this.speed = this.statsP.speed;
        this.fireCooldown = 1000 / this.statsP.atkspeed;

        console.log(`Upgrade aplicado: ${upgrade.label}`, JSON.stringify(this.statsP));
    }

    public takedmg(amount: number): void {
        if (GameState.isPaused || GameState.isGameOver) return;

        const now = Date.now();
        if (now - this.lastDamageTime < this.damageCooldown) return;

        this.lastDamageTime = now;
        this.statsP.hp -= amount;
        console.log("Player HP:", this.statsP.hp);

        if (this.statsP.hp <= 0) {
            this.triggerGameOver();
        }
    }

    private triggerGameOver(): void {
        GameState.isGameOver = true;
        document.getElementById("upgrade-screen")?.remove();
        this.showGameOverScreen();
    }

    private showGameOverScreen(): void {
        const existing = document.getElementById("game-over-screen");
        if (existing) return;

        const screen = document.createElement("div");
        screen.id = "game-over-screen";
        screen.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            font-family: sans-serif;
            color: white;
        `;

        screen.innerHTML = `
            <h1 style="font-size: 4rem; margin-bottom: 1rem; color: #e74c3c;">GAME OVER</h1>
            <p style="font-size: 1.5rem; margin-bottom: 2rem;">
                Nível ${this.statsP.level} — ${this.statsP.xp} XP acumulado
            </p>
            <button id="restart-btn" style="
                padding: 1rem 2.5rem;
                font-size: 1.2rem;
                background: #e74c3c;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
            ">Jogar Novamente</button>
        `;

        document.body.appendChild(screen);
        document.getElementById("restart-btn")?.addEventListener("click", () => {
            window.location.reload();
        });
    }

    public constructor(public mesh: Mesh) {}

	public onStart(): void {
		this.mesh.metadata = this.mesh.metadata ?? {};
		this.mesh.metadata.playerComponent = this;

		const scene = this.mesh.getScene();
		const canvas = scene.getEngine().getRenderingCanvas();

		if (scene.activeCamera) {
			scene.activeCamera.detachControl();
		}

		if (canvas) {
			canvas.setAttribute("tabindex", "1");
			canvas.focus();
		}

		document.addEventListener("keydown", (e) => {
			const key = e.code;

			if (key === "Escape") {
				if (!GameState.isGameOver && !document.getElementById("upgrade-screen")) {
					GameState.isPaused = !GameState.isPaused;
					this.togglePauseScreen(GameState.isPaused);
				}
				return;
			}

			if (!GameState.isPaused && !GameState.isGameOver) {
				inputMap[key] = true;
			}
		});

		document.addEventListener("keyup", (e) => {
			inputMap[e.code] = false;
		});
	}

    private togglePauseScreen(show: boolean): void {
        const existing = document.getElementById("pause-screen");
        if (show) {
            if (existing) return;
            const screen = document.createElement("div");
            screen.id = "pause-screen";
            screen.style.cssText = `
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 9998;
                font-family: sans-serif;
                color: white;
            `;
            screen.innerHTML = `
                <h1 style="font-size: 3rem;">PAUSADO</h1>
                <p style="font-size: 1.2rem; margin-top: 1rem;">Pressione ESC para continuar</p>
            `;
            document.body.appendChild(screen);
        } else {
            existing?.remove();
        }
    }

    private findClosestEnemy(): AbstractMesh | null {
        const enemies = this.mesh.getScene().meshes.filter(m => m.name === "Enemy");
        if (enemies.length === 0) return null;

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

    private checkEnemyCollisions(): void {
        const enemies = this.mesh.getScene().meshes.filter(m => m.name === "Enemy");
        for (const enemy of enemies) {
            if (this.mesh.intersectsMesh(enemy, false)) {
                const dmg = enemy.metadata?.initialStats?.dmg ?? 1;
                this.takedmg(dmg);
                break;
            }
        }
    }

    public onUpdate(): void {
        if (GameState.isPaused || GameState.isGameOver) return;

        const dt = this.mesh.getScene().getEngine().getDeltaTime();
        this.timeSinceLastShot += dt;

        if (this.timeSinceLastShot >= this.fireCooldown) {
            const target = this.findClosestEnemy();
            if (target) {
                const direction = target.position.subtract(this.mesh.position);
                direction.y = 0;
                const projectile = Projectile.create(
                    this.mesh.getScene(),
                    this.mesh.position,
                    direction
                );
                this.projectiles.push(projectile);
            }
            this.timeSinceLastShot = 0;
        }

        this.projectiles = this.projectiles.filter(p => p.update());
        this.checkEnemyCollisions();

        if (inputMap["ArrowUp"]||inputMap["KeyW"]) this.mesh.moveWithCollisions(new Vector3(0, 0, this.speed));
        if (inputMap["ArrowDown"]||inputMap["KeyS"]) this.mesh.moveWithCollisions(new Vector3(0, 0, -this.speed));
        if (inputMap["ArrowLeft"]||inputMap["KeyA"]) this.mesh.moveWithCollisions(new Vector3(-this.speed, 0, 0));
        if (inputMap["ArrowRight"]||inputMap["KeyD"]) this.mesh.moveWithCollisions(new Vector3(this.speed, 0, 0));
    }
}