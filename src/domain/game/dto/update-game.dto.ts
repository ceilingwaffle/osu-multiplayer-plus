import { GameMessageTargetAction } from "../game-message-target-action";

export class UpdateGameDto {
  /**
   * The ID of the game being updated.
   *
   * @type {number}
   * @memberof UpdateGameDto
   */
  readonly gameId: number;
  /**
   * The MessageTarget to be "actioned" on the game entity (e.g. added/removed/etc).
   *
   * @type {GameMessageTargetAction}
   * @memberof UpdateGameDto
   */
  readonly gameMessageTargetAction: GameMessageTargetAction;
}
