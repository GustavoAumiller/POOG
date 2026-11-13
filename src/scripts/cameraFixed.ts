import { TargetCamera, Vector3 } from "@babylonjs/core";
import { IScript } from "babylonjs-editor-tools";
import { CameraManager, CameraRig } from "./cameraManager";

// Câmera 2: fixa, acompanha o personagem mantendo sempre a mesma distância e o mesmo ângulo.
export default class CameraFixed implements IScript, CameraRig {
    private static readonly SLOT = 2;

    private offset = Vector3.Zero();

    public constructor(public camera: TargetCamera) {}

    public onStart(): void {
        CameraManager.register(CameraFixed.SLOT, this);
    }

    public onStop(): void {
        CameraManager.unregister(CameraFixed.SLOT);
    }

    public init(target: Vector3): void {
        this.camera.computeWorldMatrix();
        this.offset = this.camera.getWorldMatrix().getTranslation().subtract(target);

        this.camera.parent = null;

        if (this.camera.rotationQuaternion) {
            this.camera.rotation = this.camera.rotationQuaternion.toEulerAngles();
            this.camera.rotationQuaternion = null;
        }
    }

    public follow(target: Vector3): void {
        this.camera.position.copyFrom(target.add(this.offset));
    }

    public getYaw(): number {
        return this.camera.rotation.y;
    }
}