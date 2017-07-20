export enum TurnStates {
    INACTIVE,
    PRE_TURN_EVENTS,
    PRE_PAYOUT_EVENTS,
    PAYOUT,
    POST_PAYOUT_EVENTS,
    PRE_PLAYER_EVENTS,
    PLAYER_ACTION,
    PLAYER_WAR,
    POST_TURN_EVENTS
}

export class FullTurn {
    private _state: TurnStates = TurnStates.INACTIVE;

}
