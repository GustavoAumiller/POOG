export interface PlayerStats {
    hp: number;
    dmg: number;
    speed: number;
    atkspeed: number;
    level: number;
    xp: number;
    xpToNextLevel: number
}

export const PLAYER = {
    player1: {
        hp: 10,
        dmg: 1,
        speed: 4,
        atkspeed:2,
        level: 0,
        xp: 0,
        xpToNextLevel: 100
    },
};