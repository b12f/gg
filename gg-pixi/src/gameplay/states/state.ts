import * as PIXI from 'pixi.js'

export abstract class State {
    public handleInput: (event: PIXI.interaction.InteractionEvent, parent: State) => State|null;
}
