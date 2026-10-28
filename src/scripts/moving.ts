import { Vector3, Mesh, AbstractMesh } from "@babylonjs/core";
import { IScript } from "babylonjs-editor-tools";
import { Projectile } from "./projectile";
import { PLAYER } from "../entities/player";
import { GameState } from "../gameState";
import { getRandomUpgrades, Upgrade } from "../entities/upgrade";
import { getWeapon } from "../entities/guns";
import EnemySpawner from "./EnemySpawner";
import {AdvancedDynamicTexture, Rectangle, TextBlock }  from "@babylonjs/gui";
import type Camera from "./camera";

const inputMap: { [key: string]: boolean } = {};


export default class SceneComponent implements IScript {
    public statsP = PLAYER.player1;
    private speed = this.statsP.speed;
    private projectiles: Projectile[] = [];
    private lastDamageTime = 0;
    private damageCooldown = 1000;
    private weaponTimers: { [weaponId: string]: number } = {};
    private hpBar!: Rectangle;
    private ui!: AdvancedDynamicTexture;
    private timerText!: TextBlock;
    private gameTime = 0;
    private modelYawOffset = 0; //mudar caso a camera esteja apontado para lugar errado
    private pointerWasLocked = false; // verifica se o mouse esta travado


    public addXp(amount: number): void {
        this.statsP.xp += amount;
        if (this.statsP.xp >= this.statsP.xpToNextLevel) {
            this.levelUp();
        }
    }

    private levelUp(): void {
        this.statsP.xp -= this.statsP.xpToNextLevel;
        this.statsP.level += 1;
        this.statsP.xpToNextLevel = Math.floor(this.statsP.xpToNextLevel * 1.5);
        GameState.isPaused = true;
        this.showUpgradeScreen();
    }

    private showUpgradeScreen(): void {
        const existing = document.getElementById("upgrade-screen");
        if (existing) return;
        this.unlockPointer();

        const options = getRandomUpgrades(3, this.statsP.weapons);

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
                    this.resumeGame();
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
        this.updateHpUI();

    }

    public takedmg(amount: number): void {
        if (GameState.isPaused || GameState.isGameOver) return;

        const now = Date.now();
        if (now - this.lastDamageTime < this.damageCooldown) return;

        this.lastDamageTime = now;
        this.statsP.hp -= amount;
        this.updateHpUI();

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
        this.unlockPointer();

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

    private getCamera(): Camera | undefined {
        return this.mesh.getScene().activeCamera?.metadata?.cameraComponent;
    }

    //trava o ponteiro para a camera seguir o movimento do mouse
    private lockPointer(): void {
        const canvas = this.mesh.getScene().getEngine().getRenderingCanvas();
        canvas?.focus();
        Promise.resolve(canvas?.requestPointerLock()).catch(() => {});
    }

        private unlockPointer(): void {
        if (document.pointerLockElement) document.exitPointerLock();
    }
 
    //metodos comum para pausar e despausar o jogo travando e destravando o mouse 
    private pauseGame(): void {
        if (GameState.isPaused || GameState.isGameOver) return;
        GameState.isPaused = true;
        for (const k in inputMap) inputMap[k] = false;
        this.togglePauseScreen(true);
        this.unlockPointer();
    }
 
    private resumeGame(): void {
        GameState.isPaused = false;
        this.togglePauseScreen(false);
        this.lockPointer();
    }



    public onStart(): void {
        GameState.isPaused = true;
        this.mesh.metadata = this.mesh.metadata ?? {};
        this.mesh.metadata.playerComponent = this;

        const scene = this.mesh.getScene();
        const canvas = scene.getEngine().getRenderingCanvas();

        if (canvas) {
            canvas.setAttribute("tabindex", "1");
            canvas.focus();
        }

        if (this.mesh.rotationQuaternion) {
            this.mesh.rotation = this.mesh.rotationQuaternion.toEulerAngles();
            this.mesh.rotationQuaternion = null;
        }

        document.addEventListener("keydown", (e) => {
            if (e.code === "Escape") {
                this.pauseGame();
                return;
            }
            if (!GameState.isPaused && !GameState.isGameOver) {
                inputMap[e.code] = true;
            }
        });

        document.addEventListener("pointerlockchange", () => {
            if (document.pointerLockElement === canvas) {
                this.pointerWasLocked = true;       // a trava foi concedida
            } else if (this.pointerWasLocked) {
                this.pointerWasLocked = false;      // o navegador tirou a trava (Esc)
                this.pauseGame();
            }
        });

        this.ui = AdvancedDynamicTexture.CreateFullscreenUI("UI",true,this.mesh.getScene());

        document.addEventListener("keyup", (e) => {
            inputMap[e.code] = false;
        });

        this.timerText = new TextBlock();

        this.timerText.text = "00:00";
        this.timerText.color = "white";
        this.timerText.fontSize = 28;

        this.timerText.top = "-45%";
        this.timerText.left = "0px";

        this.ui.addControl(this.timerText);

        const hpBg = new Rectangle();
        hpBg.width = "150px";
        hpBg.height = "15px";
        hpBg.thickness = 1.5;
        hpBg.color = "white";
        hpBg.background = "black";

        this.ui.addControl(hpBg);

        this.hpBar = new Rectangle();
        this.hpBar.width = 1;
        this.hpBar.height = 1;
        this.hpBar.thickness = 0;
        this.hpBar.background = "green";
        this.hpBar.horizontalAlignment = Rectangle.HORIZONTAL_ALIGNMENT_LEFT;

        hpBg.addControl(this.hpBar);

        hpBg.linkWithMesh(this.mesh);
        hpBg.linkOffsetY = -100;
        this.updateHpUI();
        this.showStartScreen();
    }
    
    private updateHpUI(): void {

        const percent = this.statsP.hp / this.statsP.maxHp;

        this.hpBar.width = percent;

            if (percent > 0.6) {
                this.hpBar.background = "green";
            } else if (percent > 0.3) {
                this.hpBar.background = "yellow";
            } else {
                this.hpBar.background = "red";
            }
    }

    private showStartScreen(): void {
        const screen = document.createElement("div");
        screen.id = "start-screen";
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
            <h1 style="font-size: 4rem; margin-bottom: 2rem;">POOG</h1>
            <button id="start-btn" style="
                padding: 1rem 2.5rem;
                font-size: 1.2rem;
                background: #e74c3c;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
            ">Iniciar</button>
        `;
        document.body.appendChild(screen);
 
        document.getElementById("start-btn")?.addEventListener("click", () => {
            screen.remove();
            this.resumeGame();
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
                <button id="resume-btn" style="
                    margin-top: 1.5rem;
                    padding: 1rem 2.5rem;
                    font-size: 1.2rem;
                    background: #e74c3c;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                ">Continuar</button>
            `;
            document.body.appendChild(screen);
            document.getElementById("resume-btn")?.addEventListener("click", () => this.resumeGame());

        } else {
            existing?.remove();
        }
    }

    private findClosestEnemy(): AbstractMesh | null {
        const enemies = EnemySpawner.enemies;
        if (enemies.length === 0) return null;

        let closest: AbstractMesh = enemies[0];
        let closestDist = Vector3.DistanceSquared(
            this.mesh.position,
            closest.position
        );

        for (const enemy of enemies) {

            const dist = Vector3.DistanceSquared(
                this.mesh.position,
                enemy.position
            );

            if (dist < closestDist) {
                closest = enemy;
                closestDist = dist;
            }
        }
        return closest;
    }

    private checkEnemyCollisions(): void {
        const enemies = EnemySpawner.enemies;

        for (const enemy of enemies) {

            const dx = this.mesh.position.x - enemy.position.x;
            const dz = this.mesh.position.z - enemy.position.z;

            if (dx * dx + dz * dz > 300 * 300) {
                continue;
            }
            
            if (this.mesh.intersectsMesh(enemy, false)) {
                const dmg = enemy.metadata?.initialStats?.dmg ?? 1;
                this.takedmg(dmg);
                break;
            }
        }
    }

    public onUpdate(): void {
        if (GameState.isPaused || GameState.isGameOver) return;
        const dt2 = this.mesh.getScene().getEngine().getDeltaTime();

        this.gameTime += dt2;

        const totalSeconds = Math.floor(this.gameTime / 1000);

        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        this.timerText.text =`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

        const dt = this.mesh.getScene().getEngine().getDeltaTime();
        const target = this.findClosestEnemy();

        for (const weaponId of this.statsP.weapons) {
            if (this.weaponTimers[weaponId] === undefined) {
                this.weaponTimers[weaponId] = 0;
            }

            this.weaponTimers[weaponId] += dt;

            const weapon = getWeapon(weaponId);

            let fireRateMultiplier = weapon.fireRateMultiplier;
            if (weaponId === "fast_gun") {
                fireRateMultiplier += this.statsP.fastGunBonusAtkSpeed;
            }

            const fireCooldown = (1000 / this.statsP.atkspeed) / fireRateMultiplier;

            if (this.weaponTimers[weaponId] >= fireCooldown) {
                if (target) {
                    const direction = target.position.subtract(this.mesh.position);
                    direction.y = 0;

                    const newProjectiles = Projectile.createSpread(
                        this.mesh.getScene(),
                        this.mesh.position,
                        direction,
                        weaponId
                    );
                    this.projectiles.push(...newProjectiles);
                }
                this.weaponTimers[weaponId] = 0;
            }
        }
        
        this.projectiles = this.projectiles.filter(p =>
            p.update(EnemySpawner.enemies)
        );

        this.checkEnemyCollisions();

        // movimento relativo ao giro da camera
        const camYaw = this.getCamera()?.getYaw() ?? 0;
        const forward = new Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
        const right   = new Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
        const move = Vector3.Zero();
 
        if (inputMap["ArrowUp"]    || inputMap["KeyW"]) move.addInPlace(forward);
        if (inputMap["ArrowDown"]  || inputMap["KeyS"]) move.subtractInPlace(forward);
        if (inputMap["ArrowRight"] || inputMap["KeyD"]) move.addInPlace(right);
        if (inputMap["ArrowLeft"]  || inputMap["KeyA"]) move.subtractInPlace(right);
 
        if (move.lengthSquared() > 0) {
            move.normalize().scaleInPlace(this.speed);
            this.mesh.moveWithCollisions(move);
        }

        if (target) {
            const dx = target.position.x - this.mesh.position.x;
            const dz = target.position.z - this.mesh.position.z;
            this.mesh.rotation.y = Math.atan2(dx, dz) + this.modelYawOffset;
        } else if (move.lengthSquared() > 0) {
            this.mesh.rotation.y = Math.atan2(move.x, move.z) + this.modelYawOffset;
        }

        this.getCamera()?.follow(this.mesh.position);
    }
}