import { Color3 } from "@babylonjs/core";

export interface WeaponStats {
    id: string;
    label: string;
    diameter: number;
    color: Color3;
    damageMultiplier: number;
    fireRateMultiplier: number;
    projectileCount: number;
    spreadAngle: number;
    pierceCount: number; 
}

export const WEAPONS: { [key: string]: WeaponStats } = {
    default: {
        id: "default",
        label: "⚡ Arma Inicial",
        diameter: 50,
        color: new Color3(1, 1, 0),
        damageMultiplier: 1,
        fireRateMultiplier: 1,
        projectileCount: 1,
        spreadAngle: 0,
        pierceCount: 0,
    },
    fast_gun: {
        id: "fast_gun",
        label: "🔵 Metralhadora",
        diameter: 25,
        color: new Color3(0, 0, 0),
        damageMultiplier: 0.6,
        fireRateMultiplier: 3,
        projectileCount: 1,
        spreadAngle: 0,
        pierceCount: 0,
    },
    plasma_cannon: {
        id: "plasma_cannon",
        label: "🟣 Canhão de Plasma",
        diameter: 100,
        color: new Color3(0.6, 0, 1),
        damageMultiplier: 10,
        fireRateMultiplier: 0.2,
        projectileCount: 1,
        spreadAngle: 0,
        pierceCount: 1,
    },
    shotgun: {
        id: "shotgun",
        label: "🔴 Shotgun",
        diameter: 40,
        color: new Color3(1, 0, 0),
        damageMultiplier: 1.2,
        fireRateMultiplier: 0.6,
        projectileCount: 3,
        spreadAngle: 45,
        pierceCount: 0,
    },
};

export function getWeapon(id: string): WeaponStats {
    return WEAPONS[id] ?? WEAPONS["default"];
}