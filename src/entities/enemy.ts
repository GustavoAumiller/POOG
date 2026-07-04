export interface EnemyStats {
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
        hp: 5,
        dmg: 1,
        speed: 4,
        size: 60,
        type: 0,
        xpDrop: 185,
        texture: "assets/Textures/inimigo_1.jpg"
    },
    orc: {
        hp: 10,
        dmg: 1,
        speed: 3,
        size: 160,
        type: 1,
        xpDrop: 1456,
        texture: "assets/Textures/inimigo_2.jpg"
    },
    goblin:{
        hp: 22,
        dmg: 1,
        speed: 3,
        size: 400,
        type: 1,
        xpDrop: 4580,
        texture: "assets/Textures/inimigo_3.jpg"
    }
};