import { Camera } from "@babylonjs/core/Cameras/camera";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Light } from "@babylonjs/core/Lights/light";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Scene } from "@babylonjs/core/scene";

interface LightControl {
    key: string;
    label: string;
    light: Light;
}

/**
 * Configura a projeção perspectiva e os controles demonstrativos de iluminação.
 * A matriz de projeção é calculada pelo Babylon.js a partir de mode, fov,
 * aspect ratio, minZ e maxZ e aplicada automaticamente durante scene.render().
 */
export function setupVisualization(scene: Scene): () => void {
    // Todas as câmeras do jogo usam projeção perspectiva (Camera.PERSPECTIVE_CAMERA = 0).
    // O FOV e os planos de recorte já vêm configurados no arquivo example.babylon.
    for (const camera of scene.cameras) {
        camera.mode = Camera.PERSPECTIVE_CAMERA;
        camera.minZ = 0.1;
        camera.maxZ = 10000;
    }

    // Primeira fonte: luz direcional existente na cena (sol).
    let sun = scene.lights.find((light) => light.name === "sun") as DirectionalLight | undefined;
    if (!sun) {
        sun = new DirectionalLight("sun", new Vector3(-1, -2, 1), scene);
        sun.position = new Vector3(100, 200, 100);
    }
    sun.diffuse = new Color3(1, 0.86, 0.68);
    sun.intensity = 1.2;
    sun.setEnabled(true);

    // Segunda fonte: luz pontual azulada no centro da arena.
    const point = new PointLight("arena-point-light", new Vector3(0, 190, 0), scene);
    point.diffuse = new Color3(0.18, 0.68, 1);
    point.specular = new Color3(0.35, 0.8, 1);
    point.intensity = 1.5;
    point.range = 900;
    point.setEnabled(true);

    // Terceira fonte: luz hemisférica para preenchimento suave das sombras.
    const ambient = new HemisphericLight("arena-ambient-light", new Vector3(0, 1, 0), scene);
    ambient.diffuse = new Color3(0.55, 0.66, 0.82);
    ambient.groundColor = new Color3(0.16, 0.19, 0.27);
    ambient.intensity = 0.45;
    ambient.setEnabled(true);

    const controls: LightControl[] = [
        { key: "F1", label: "Direcional (sol)", light: sun },
        { key: "F2", label: "Pontual (azul)", light: point },
        { key: "F3", label: "Ambiente (hemisférica)", light: ambient },
    ];

    const panel = document.createElement("div");
    panel.id = "visualization-controls";
    panel.style.cssText = [
        "position:fixed", "top:16px", "left:16px", "z-index:1000",
        "padding:12px 14px", "border:1px solid rgba(125,211,252,.55)",
        "border-radius:10px", "background:rgba(8,15,30,.82)",
        "color:#f8fafc", "font:12px/1.6 Arial,sans-serif",
        "box-shadow:0 4px 18px rgba(0,0,0,.35)", "pointer-events:none",
        "min-width:220px",
    ].join(";");

    const renderPanel = () => {
        const lightStatus = controls.map(({ key, label, light }) =>
            `<div><strong>${key}</strong> — ${label}: <span style="color:${light.isEnabled() ? "#86efac" : "#fca5a5"}">${light.isEnabled() ? "LIGADA" : "DESLIGADA"}</span></div>`
        ).join("");
        panel.innerHTML = `
            <div style="font-size:14px;font-weight:700;margin-bottom:5px">VISUALIZAÇÃO</div>
            <div>1: Orbital · 2: Fixa · 3: Superior</div>
            <div style="font-size:14px;font-weight:700;margin:8px 0 4px">ILUMINAÇÃO</div>
            ${lightStatus}
            <div style="opacity:.75;margin-top:6px">Projeção: perspectiva</div>
        `;
    };

    const onKeyDown = (event: KeyboardEvent) => {
        const control = controls.find(({ key }) => key === event.key.toUpperCase());
        if (!control) return;
        event.preventDefault();
        control.light.setEnabled(!control.light.isEnabled());
        renderPanel();
    };

    renderPanel();
    document.body.appendChild(panel);
    document.addEventListener("keydown", onKeyDown);

    return () => {
        document.removeEventListener("keydown", onKeyDown);
        panel.remove();
        point.dispose();
        ambient.dispose();
        // O sol já pertence ao arquivo da cena; não o descartamos aqui.
    };
}
