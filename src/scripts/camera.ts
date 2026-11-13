import { TargetCamera, Vector3 } from "@babylonjs/core";
import { IScript } from "babylonjs-editor-tools";
import { GameState } from "../gameState";
import { CameraManager, CameraRig } from "./cameraManager";

export default class CameraOrbit implements IScript, CameraRig{
    private static readonly SLOT = 1;

    private yaw = 0;
    private pitch = 0.9;
    private radius = 10;
    private initialized = false;

    private sensitivity = 0.002;
    private minPitch = 0.15;
    private maxPitch = 1.45;

    private onMouseMove = (e: MouseEvent) => {
        if (!CameraManager.isActive(this)) return;   // só gira quando é a câmera ativa
        if (GameState.isPaused || GameState.isGameOver) return;
 
        this.yaw += e.movementX * this.sensitivity;
        this.pitch += e.movementY * this.sensitivity;
        this.pitch = Math.min(this.maxPitch, Math.max(this.minPitch, this.pitch));
    };


    public constructor(public camera: TargetCamera) {}

    public onStart(): void {
        CameraManager.register(CameraOrbit.SLOT, this);
        document.addEventListener("mousemove", this.onMouseMove);
    }

    public onStop(): void {
        document.removeEventListener("mousemove", this.onMouseMove);
        CameraManager.unregister(CameraOrbit.SLOT);
    }

    public getYaw(): number {
        return this.yaw;
    }

    // chamado pelo player no onUpdate
    public follow(target: Vector3): void {
        const cosP = Math.cos(this.pitch);
        const offset = new Vector3(
            -Math.sin(this.yaw) * cosP,
            Math.sin(this.pitch),
            -Math.cos(this.yaw) * cosP
        ).scaleInPlace(this.radius);

        this.camera.position.copyFrom(target.add(offset));
        this.camera.setTarget(target);
    }


    // usa a posição atual da câmera para começar com o mesmo enquadramento
    public init(target: Vector3): void {
        this.camera.computeWorldMatrix();
        const offset = this.camera.getWorldMatrix().getTranslation().subtract(target);
        const radius = offset.length();
 
        if (radius > 0.001) {
            this.radius = radius;
            this.yaw = Math.atan2(-offset.x, -offset.z);
            this.pitch = Math.asin(offset.y / radius);
            this.pitch = Math.min(this.maxPitch, Math.max(this.minPitch, this.pitch));
        }
 
        this.camera.parent = null;
    }
}