export class AddLobbyDto {
  readonly banchoMultiplayerId: string;
  /**
   * If undefined, the lobby is added to the most recent game created by the user.
   *
   * @type {number}
   */
  readonly gameId?: number;
}
