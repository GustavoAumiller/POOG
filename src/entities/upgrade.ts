import { PlayerStats } from "./player";

export interface Upgrade {
    id: string;
    label: string;
    description: string;
    requiresWeapon?: string; 
    apply: (stats: PlayerStats) => void;
}

export const UPGRADES: Upgrade[] = [
    {
        id: "speed",
        label: "👟🪽 Velocidade de Movimento",
        description: "Aumenta a velocidade de movimento em 15%",
        apply: (stats) => { stats.speed *= 1.15; }
    },
    {
        id: "hpRegen",
        label: "💚 Cura",
        description: "Cura 3 de HP",
        apply: (stats) => {
            stats.hp = Math.min(stats.hp + 3, stats.maxHp);
        }
    },
    {
        id: "unlock_fast_gun",
        label: "🔓 Desbloquear Metralhadora",
        description: "Adiciona a Metralhadora ao seu arsenal",
        apply: (stats) => {
            if (!stats.weapons.includes("fast_gun")) stats.weapons.push("fast_gun");
        }
    },
    {
        id: "unlock_plasma_cannon",
        label: "🔓 Desbloquear Sniper",
        description: "Adiciona o Sniper ao seu arsenal",
        apply: (stats) => {
            if (!stats.weapons.includes("plasma_cannon")) stats.weapons.push("plasma_cannon");
        }
    },
    {
        id: "unlock_shotgun",
        label: "🔓 Desbloquear Shotgun",
        description: "Adiciona a Shotgun ao seu arsenal",
        apply: (stats) => {
            if (!stats.weapons.includes("shotgun")) stats.weapons.push("shotgun");
        }
    },
    {
        id: "shotgun_extra_projectile",
        label: "=══==╦︻ Shotgun: +1 Projétil",
        description: "Shotgun dispara mais 1 projétil e aumenta o ângulo de dispersão",
        requiresWeapon: "shotgun",
        apply: (stats) => {
            stats.shotgunBonusProjectiles += 1;
            stats.shotgunBonusSpread += 10; 
        }
    },
    {
        id: "fast_gun_extra_speed",
        label: "ᡕᠵデ气亠 Metralhadora: +Cadência",
        description: "Metralhadora atira 25% mais rápido",
        requiresWeapon: "fast_gun",
        apply: (stats) => { stats.fastGunBonusAtkSpeed += 0.25; }
    },
    {
        id: "default_extra_dmg",
        label: "🗡️ Arma Inicial: +Dano",
        description: "Arma inicial causa +2 de dano",
        requiresWeapon: "default",
        apply: (stats) => { stats.defaultBonusDmg += 2; }
    },
{
    id: "plasma_extra_pierce",
    label: "︻芫═─── Sniper : +Perfuração",
    description: "Plasma atravessa mais 1 inimigo e aumenta o tamanho do projétil",
    requiresWeapon: "plasma_cannon",
    apply: (stats) => {
        stats.plasmaBonusPierce += 1;
        stats.plasmaBonusSize += 20; 
    }
},
];

export function getRandomUpgrades(count: number = 3, unlockedWeapons: string[] = []): Upgrade[] {
    const available = UPGRADES.filter(upgrade => {
        if (upgrade.id.startsWith("unlock_")) {
            const weaponId = upgrade.id.replace("unlock_", "");
            return !unlockedWeapons.includes(weaponId);
        }
        if (upgrade.requiresWeapon) {
            return unlockedWeapons.includes(upgrade.requiresWeapon);
        }
        return true;
    });
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

