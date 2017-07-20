import * as PIXI from 'pixi.js';

import { Player } from './player';
/*

    PRE_TURN_EVENTS,
    PRE_PAYOUT_EVENTS,
    PAYOUT,
    POST_PAYOUT_EVENTS,
    PRE_PLAYER_EVENTS,
    PLAYER_ACTION,
    PLAYER_WAR,

    POST_TURN_EVENTS*/


export class Game {
    private _state;
    private _currentPlayerIndex: number = 0;

    constructor(
        public players: Player[]
    ) {}

    public get state() {
        return this._state;
    }

    public get currentPlayer(): Player {
        return this.players[this._currentPlayerIndex];
    }

    public get currentPlayerIndex(): number {
        return this._currentPlayerIndex;
    }

    public next(): number {
        this._currentPlayerIndex++;

        if (this._currentPlayerIndex >= this.players.length) {
            this._currentPlayerIndex = 0;
        }

        return this._currentPlayerIndex
    }
}
