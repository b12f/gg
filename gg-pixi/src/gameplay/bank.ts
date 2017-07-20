import { Inventory } from './inventory';


export interface Price {
    wood: number;
    food: number;
    stone: number;
    gold: number;
    iron: number;
}

export interface Item {
    cost: Price;
}

export const RAW_MATERIALS = ['wood', 'food', 'stone', 'gold', 'iron'];

export class Bank {
    private _wood: number = Infinity;
    private _food: number = Infinity;
    private _stone: number = Infinity;
    private _gold: number = Infinity;
    private _iron: number = Infinity;

    public buy(item: Item, inventory: Inventory): Inventory {
        let price = item.cost;
        let hasEnough = true;
        for (let material of RAW_MATERIALS) {
            if (!price[material]) {
                continue;
            }
            hasEnough = hasEnough && price[material] > inventory[material];
        }

        if (hasEnough) {
            inventory = inventory.copy();
            for (let material of RAW_MATERIALS) {
                if (!price[material]) {
                    continue;
                }
                inventory[material] = inventory[material] - price[material];
            }

            return inventory;
        }
    }
}
