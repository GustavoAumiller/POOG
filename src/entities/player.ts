export interface PlayerStats {
    maxHp: number;
    hp: number;
    dmg: number;
    speed: number;
    atkspeed: number;
    level: number;
    xp: number;
    xpToNextLevel: number;
    weapons: string[];
    shotgunBonusProjectiles: number;
    shotgunBonusSpread: number;
    fastGunBonusAtkSpeed: number;
    defaultBonusDmg: number;
    plasmaBonusPierce: number;
    plasmaBonusSize: number; 
}

export const PLAYER = {
    player1: {
        maxHp: 10,
        hp: 10,
        dmg: 1,
        speed: 4,
        atkspeed: 2,
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        weapons: ["default"],
        shotgunBonusProjectiles: 0,
        shotgunBonusSpread: 0,
        fastGunBonusAtkSpeed: 0,
        defaultBonusDmg: 0,
        plasmaBonusPierce: 0,
        plasmaBonusSize: 0,
    },
};