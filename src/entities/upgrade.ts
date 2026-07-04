import { PlayerStats } from "./player";

export interface Upgrade {
    id: string;
    label: string;
    description: string;
    apply: (stats: PlayerStats) => void;
}

export const UPGRADES: Upgrade[] = [
    {
        id: "atkspeed",
        label: "⚡ Velocidade de Ataque",
        description: "Aumenta a velocidade de ataque em 20%",
        apply: (stats) => { stats.atkspeed *= 1.2; }
    },
    {
        id: "dmg",
        label: "⚔️ Dano",
        description: "Aumenta o dano dos projéteis em 1",
        apply: (stats) => { stats.dmg += 1; }
    },
    {
        id: "speed",
        label: "👟 Velocidade de Movimento",
        description: "Aumenta a velocidade de movimento em 15%",
        apply: (stats) => { stats.speed *= 1.15; }
    },
    {
        id: "hp",
        label: "❤️ Vida Máxima",
        description: "Aumenta o HP máximo em 5 e restaura 5 de vida",
        apply: (stats) => { stats.hp += 5; }
    },
    {
        id: "hpRegen",
        label: "💊 Regeneração",
        description: "Restaura 3 de HP agora",
        apply: (stats) => { stats.hp = Math.min(stats.hp + 3, stats.hp + 3); }
    },
];

// retorna 3 upgrades aleatórios sem repetição
export function getRandomUpgrades(count: number = 3): Upgrade[] {
    const shuffled = [...UPGRADES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}