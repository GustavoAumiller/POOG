import { Camera, Vector3 } from "@babylonjs/core";

// interface das cameras
export interface CameraRig {
    camera: Camera;
    init(target: Vector3): void;
    follow(target: Vector3): void;
    getYaw(): number;     
}

// classe gerenciadora das cameras
export class CameraManager {
    private static rigs = new Map<number, CameraRig>();
    private static ready = new Set<CameraRig>();
    private static active?: CameraRig;
    private static activeSlot = Infinity;
    private static lastTarget?: Vector3;

    // registra as cameras na classe
    public static register(slot: number, rig: CameraRig): void {
        const previous = this.rigs.get(slot);
        if (previous) this.ready.delete(previous);
        this.rigs.set(slot, rig);

        try {
            rig.camera.detachControl();
            rig.camera.inputs.clear();
        } catch (error) {
            console.warn(`[CameraManager] Não foi possível desligar os controles da câmera ${slot}`, error);
        }

        if (previous === this.active || slot < this.activeSlot) this.select(slot);
    }

    // retira as cameras da classe
    public static unregister(slot: number): void {
        const rig = this.rigs.get(slot);
        if (!rig) return;

        this.rigs.delete(slot);
        this.ready.delete(rig);

        if (this.active === rig) {
            this.active = undefined;
            this.activeSlot = Infinity;
        }
        if (this.rigs.size === 0) this.lastTarget = undefined;
    }

    // troca a câmera ativa
    public static select(slot: number): void {
        const rig = this.rigs.get(slot);
        if (!rig) return;

        // const rig = this.rigs.get(slot);
        // if (!rig) return;

        this.active = rig;
        this.activeSlot = slot;
        rig.camera.getScene().activeCamera = rig.camera;

        // posiciona camera
        if (this.lastTarget && this.ready.has(rig)) rig.follow(this.lastTarget);
    }

    public static isActive(rig: CameraRig): boolean {
        return this.active === rig;
    }

    public static getYaw(): number {
        return this.active?.getYaw() ?? 0;
    }

    // player chama isto no fim do onUpdate
    public static update(target: Vector3): void {
        this.lastTarget = target.clone();

        for (const rig of this.rigs.values()) {
            if (this.ready.has(rig)) continue;
            rig.camera.detachControl();
            rig.camera.inputs.clear();
            rig.init(target);
            this.ready.add(rig);
        }

        this.active?.follow(target);
    }
}