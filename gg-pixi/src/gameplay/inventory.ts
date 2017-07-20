export class Inventory {
    wood: number = 0;
    stone: number = 0;
    food: number = 0;
    gold: number = 0;
    iron: number = 0;

    village: number = 10;
    city: number = 5;
    wall: number = 10;
    numberChip: number = Infinity;
    army_1: number = 6;
    army_2: number = 4;
    army_3: number = 3;

    mercant: number = 5;
    diplomat: number = 5;

    constructor(
        options: Inventory
    ) {
        for (let key of Object.keys(options)) {
            this[key] = options[key];
        }
    }

    copy(): Inventory {
        return new Inventory(this);
    }
}
