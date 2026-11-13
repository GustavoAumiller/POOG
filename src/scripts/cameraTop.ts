import { TargetCamera, Vector3 } from "@babylonjs/core";
import { IScript } from "babylonjs-editor-tools";
import { CameraManager, CameraRig } from "./cameraManager";


export default class CameraTop implements IScript, CameraRig {
    private static readonly SLOT = 3;

    private height = 1000;
    private tilt = Math.PI / 2 - 0.001;

    public constructor(public camera: TargetCamera) {}

    public onStart(): void {
        CameraManager.register(CameraTop.SLOT, this);
    }

    public onStop(): void {
        CameraManager.unregister(CameraTop.SLOT);
    }

    public init(target: Vector3): void {
        this.camera.computeWorldMatrix();
        const height = this.camera.getWorldMatrix().getTranslation().y - target.y;
        if (height > 1) this.height = height;

        this.camera.parent = null;
        this.camera.rotationQuaternion = null;
        this.camera.rotation.set(this.tilt, 0, 0);
    }

    public follow(target: Vector3): void {
        this.camera.position.set(target.x, target.y + this.height, target.z);
    }

    public getYaw(): number {
        return 0;
    }
}