import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Color3 } from "@babylonjs/core/Maths/math.color";

type Painter = (ctx: CanvasRenderingContext2D, size: number, rand: () => number) => void;

// Gerador pseudo-aleatório com semente: a textura sai igual em toda execução.
function mulberry32(seed: number): () => number {
    return () => {
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function make(
    scene: Scene, name: string, size: number, paint: Painter,
    uScale = 1, vScale = 1, seed = 1,
): DynamicTexture {
    const tex = new DynamicTexture(name, { width: size, height: size }, scene, true);
    paint(tex.getContext() as CanvasRenderingContext2D, size, mulberry32(seed));
    tex.update();
    tex.wrapU = Texture.WRAP_ADDRESSMODE;
    tex.wrapV = Texture.WRAP_ADDRESSMODE;
    tex.uScale = uScale;
    tex.vScale = vScale;
    tex.anisotropicFilteringLevel = 8;
    return tex;
}

function speckle(ctx: CanvasRenderingContext2D, size: number, rand: () => number, count: number, alpha: number) {
    for (let i = 0; i < count; i++) {
        ctx.fillStyle = rand() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
        ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
    }
}

/** Placa de metal com borda, brilho interno e rebites (usada no robô). */
/** Painel de metal pintado, com bordas, desgaste e rebites. */
export function createPanelTexture(scene: Scene, hex: string, rivets = true): DynamicTexture {
    return make(scene, `tex-panel-${hex}`, 256, (ctx, s, rand) => {
        // Base pintada com uma variação suave de luminosidade.
        ctx.fillStyle = hex;
        ctx.fillRect(0, 0, s, s);

        const gradient = ctx.createLinearGradient(0, 0, s, s);
        gradient.addColorStop(0, "rgba(255,255,255,0.16)");
        gradient.addColorStop(0.45, "rgba(255,255,255,0.015)");
        gradient.addColorStop(1, "rgba(0,0,0,0.24)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, s, s);

        // Ruído fino da pintura.
        speckle(ctx, s, rand, 2200, 0.045);

        // Borda externa escura e filete interno de metal.
        ctx.strokeStyle = "rgba(0,0,0,0.72)";
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, s - 10, s - 10);

        ctx.strokeStyle = "rgba(210,225,235,0.38)";
        ctx.lineWidth = 2;
        ctx.strokeRect(13, 13, s - 26, s - 26);

        // Desgaste concentrado nas bordas.
        for (let i = 0; i < 90; i++) {
            const side = Math.floor(rand() * 4);
            const offset = 18 + rand() * (s - 36);
            const length = 2 + rand() * 10;

            ctx.fillStyle = rand() > 0.45
                ? "rgba(220,230,235,0.28)"
                : "rgba(0,0,0,0.24)";

            if (side === 0) ctx.fillRect(offset, 14, length, 2);
            if (side === 1) ctx.fillRect(offset, s - 16, length, 2);
            if (side === 2) ctx.fillRect(14, offset, 2, length);
            if (side === 3) ctx.fillRect(s - 16, offset, 2, length);
        }

        // Pequenos riscos na superfície.
        ctx.lineWidth = 1;
        for (let i = 0; i < 35; i++) {
            const x = 24 + rand() * (s - 48);
            const y = 24 + rand() * (s - 48);
            const length = 3 + rand() * 15;

            ctx.strokeStyle = rand() > 0.5
                ? "rgba(255,255,255,0.13)"
                : "rgba(0,0,0,0.15)";

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + length, y + (rand() - 0.5) * 2);
            ctx.stroke();
        }

        if (rivets) {
            for (const [x, y] of [
                [26, 26],
                [s - 26, 26],
                [26, s - 26],
                [s - 26, s - 26],
            ]) {
                // Sombra do rebite.
                ctx.fillStyle = "rgba(0,0,0,0.65)";
                ctx.beginPath();
                ctx.arc(x + 1, y + 2, 7, 0, Math.PI * 2);
                ctx.fill();

                // Corpo metálico.
                const rivet = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 7);
                rivet.addColorStop(0, "#e4edf2");
                rivet.addColorStop(0.45, "#8295a3");
                rivet.addColorStop(1, "#273644");

                ctx.fillStyle = rivet;
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, Math.PI * 2);
                ctx.fill();

                // Fenda central.
                ctx.strokeStyle = "rgba(15,25,35,0.8)";
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(x - 2, y);
                ctx.lineTo(x + 2, y);
                ctx.stroke();
            }
        }
    }, 1, 1, 7);
}

/** Piso de placas. tiles = quantas vezes a textura se repete na malha. */
/** Piso modular de placas metálicas. tiles = repetições da textura na malha. */
export function createGroundTexture(scene: Scene, tiles = 40): DynamicTexture {
    return make(scene, "tex-ground", 512, (ctx, s, rand) => {
        const n = 8;
        const cell = s / n;

        // Fundo escuro das juntas entre as placas.
        ctx.fillStyle = "#111b27";
        ctx.fillRect(0, 0, s, s);

        for (let row = 0; row < n; row++) {
            for (let col = 0; col < n; col++) {
                const x = col * cell;
                const y = row * cell;
                const inset = 4;

                const variation = Math.floor(rand() * 15);
                const base = 48 + variation;

                // Corpo da placa.
                ctx.fillStyle = `rgb(${base - 5}, ${base + 3}, ${base + 13})`;
                ctx.fillRect(
                    x + inset,
                    y + inset,
                    cell - inset * 2,
                    cell - inset * 2,
                );

                // Relevo simulado nas bordas.
                const bevel = ctx.createLinearGradient(x, y, x + cell, y + cell);
                bevel.addColorStop(0, "rgba(255,255,255,0.19)");
                bevel.addColorStop(0.35, "rgba(255,255,255,0.025)");
                bevel.addColorStop(1, "rgba(0,0,0,0.34)");

                ctx.fillStyle = bevel;
                ctx.fillRect(
                    x + inset,
                    y + inset,
                    cell - inset * 2,
                    cell - inset * 2,
                );

                // Moldura interna.
                ctx.strokeStyle = "rgba(5,12,20,0.85)";
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    x + 8,
                    y + 8,
                    cell - 16,
                    cell - 16,
                );

                ctx.strokeStyle = "rgba(180,205,220,0.18)";
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    x + 10,
                    y + 10,
                    cell - 20,
                    cell - 20,
                );

                // Pequenas marcas de desgaste.
                for (let i = 0; i < 18; i++) {
                    const px = x + 12 + rand() * (cell - 24);
                    const py = y + 12 + rand() * (cell - 24);

                    ctx.fillStyle = rand() > 0.5
                        ? "rgba(220,230,240,0.07)"
                        : "rgba(0,0,0,0.09)";

                    ctx.fillRect(px, py, 1 + rand() * 3, 1 + rand() * 2);
                }

                // Parafusos nos cantos da placa.
                for (const [bx, by] of [
                    [x + 13, y + 13],
                    [x + cell - 13, y + 13],
                    [x + 13, y + cell - 13],
                    [x + cell - 13, y + cell - 13],
                ]) {
                    ctx.fillStyle = "rgba(0,0,0,0.65)";
                    ctx.beginPath();
                    ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = "rgba(165,185,198,0.75)";
                    ctx.beginPath();
                    ctx.arc(bx - 0.5, by - 0.5, 2.3, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.strokeStyle = "rgba(15,25,35,0.8)";
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(bx - 1.2, by);
                    ctx.lineTo(bx + 1.2, by);
                    ctx.stroke();
                }
            }
        }
    }, tiles, tiles, 3);
}

export interface PBRTextureSet {
    color: Texture;
    normal: Texture;
    orm: Texture;
}

const pbrTextureCache = new WeakMap<
    Scene,
    { robot?: PBRTextureSet; ground?: PBRTextureSet }
>();

function loadPBRTexture(
    scene: Scene,
    path: string,
    isColor: boolean,
): Texture {
    const texture = new Texture(
        path,
        scene,
        false,
        true,
        Texture.TRILINEAR_SAMPLINGMODE,
    );

    texture.wrapU = Texture.WRAP_ADDRESSMODE;
    texture.wrapV = Texture.WRAP_ADDRESSMODE;
    texture.anisotropicFilteringLevel = 4;
    texture.gammaSpace = isColor;

    return texture;
}

function getPBRTextureSet(
    scene: Scene,
    type: "robot" | "ground",
    folder: string,
): PBRTextureSet {
    let cache = pbrTextureCache.get(scene);

    if (!cache) {
        cache = {};
        pbrTextureCache.set(scene, cache);
    }

    if (!cache[type]) {
        cache[type] = {
            color: loadPBRTexture(
                scene,
                `${folder}/color.jpg`,
                true,
            ),
            normal: loadPBRTexture(
                scene,
                `${folder}/normal.jpg`,
                false,
            ),
            orm: loadPBRTexture(
                scene,
                `${folder}/orm.jpg`,
                false,
            ),
        };
    }

    return cache[type]!;
}

export function getRobotPBRTextures(scene: Scene): PBRTextureSet {
    return getPBRTextureSet(
        scene,
        "robot",
        "/textures/robot/painted-metal",
    );
}

export function getGroundPBRTextures(scene: Scene): PBRTextureSet {
    return getPBRTextureSet(
        scene,
        "ground",
        "/textures/arena/tiles072",
    );
}

const ENEMY_PAINTERS: { [type: string]: Painter } = {
    slime: (ctx, s, rand) => {
        ctx.fillStyle = "#3fa84a"; ctx.fillRect(0, 0, s, s);
        for (let i = 0; i < 14; i++) {
            ctx.fillStyle = `rgba(190,255,190,${0.1 + rand() * 0.15})`;
            ctx.beginPath(); ctx.arc(rand() * s, rand() * s, 12 + rand() * 30, 0, Math.PI * 2); ctx.fill();
        }
    },
    orc: (ctx, s, rand) => {
        ctx.fillStyle = "#7a3b2e"; ctx.fillRect(0, 0, s, s);
        speckle(ctx, s, rand, 2500, 0.15);
        ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
            let x = rand() * s, y = 0;
            ctx.beginPath(); ctx.moveTo(x, y);
            while (y < s) { x += (rand() - 0.5) * 30; y += 20 + rand() * 20; ctx.lineTo(x, y); }
            ctx.stroke();
        }
    },
    goblin: (ctx, s, rand) => {
        ctx.fillStyle = "#5b4a7a"; ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        const step = s / 8;
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2 === 0) ctx.fillRect(i * step, j * step, step, step);
        speckle(ctx, s, rand, 2000, 0.1);
    },
};

const enemyMaterials = new WeakMap<Scene, { [type: string]: StandardMaterial }>();

/** Um material por tipo de inimigo, compartilhado entre todas as instâncias. */
export function getEnemyMaterial(scene: Scene, type: string): StandardMaterial {
    const cache = enemyMaterials.get(scene) ?? {};
    enemyMaterials.set(scene, cache);
    if (!cache[type]) {
        const mat = new StandardMaterial(`mat_enemy_${type}`, scene);
        mat.diffuseTexture = make(scene, `tex-enemy-${type}`, 256, ENEMY_PAINTERS[type] ?? ENEMY_PAINTERS.slime, 1, 1, 5);
        mat.specularColor.set(0.1, 0.1, 0.1);
        cache[type] = mat;
    }
    return cache[type];
}

/** Aplica o piso à malha do chão da cena (PBR ou Standard). */
/** Aplica Tiles 072 ao piso da arena. */
export function applyGroundTexture(
    scene: Scene,
    tiles = 40,
): AbstractMesh | undefined {
    const ground = scene.meshes.find((m) =>
        /ground|floor|chao|ch[ãa]o/i.test(m.name)
    );

    if (!ground) {
        console.warn("[textures] Malha do chão não encontrada.");
        return undefined;
    }

    let material: PBRMaterial;

    if (ground.material instanceof PBRMaterial) {
        material = ground.material;
    } else {
        material = new PBRMaterial("mat_ground_pbr", scene);
        ground.material = material;
    }

    const maps = getGroundPBRTextures(scene);

    for (const texture of [maps.color, maps.normal, maps.orm]) {
        texture.uScale = tiles;
        texture.vScale = tiles;
    }

    material.albedoTexture = maps.color;
    material.albedoColor = Color3.White();

    material.bumpTexture = maps.normal;
    material.bumpTexture.level = 0.8;

    material.metallicTexture = maps.orm;
    material.useRoughnessFromMetallicTextureGreen = true;
    material.useMetallnessFromMetallicTextureBlue = true;
    material.useAmbientOcclusionFromMetallicTextureRed = true;

    material.metallic = 1;
    material.roughness = 1;
    material.ambientTextureStrength = 0.7;

    return ground;
}