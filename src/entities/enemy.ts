export interface EnemyStats {
    maxHp : number,
    hp: number;
    dmg: number;
    speed: number;
    size: number;
    type: number;
    xpDrop: number;
    texture?: string;
}

export const ENEMIES = {
    slime: {
        maxHp : 5,
        hp: 5,
        dmg: 1,
        speed: 5,
        size: 60,
        type: 2,
        xpDrop: 100,
        texture: "assets/Textures/test1.jpg"
    },
    orc: {
        maxHp : 10,
        hp: 10,
        dmg: 1,
        speed: 4,
        size: 160,
        type: 0,
        xpDrop: 100,
        texture: "assets/Textures/inimigo_2.jpg"
    },
    goblin:{
        maxHp : 22,
        hp: 22,
        dmg: 1,
        speed: 3,
        size: 400,
        type: 1,
        xpDrop: 100,
        texture: "assets/Textures/inimigo_3.jpg"
    }
};

export const TYPE_DAMAGE_MULTIPLIER: { [type: number]: number } = {
    0: 1, 
    1: 2,
    2: 0.5
};

export function getDamageMultiplier(type: number): number {
    return TYPE_DAMAGE_MULTIPLIER[type] ?? 1;
}