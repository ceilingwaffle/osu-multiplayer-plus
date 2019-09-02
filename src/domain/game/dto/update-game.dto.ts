import { GameMessageTargetAction } from "../game-message-target-action";
import { CreateGameDto } from "./create-game.dto";

export class UpdateGameDto extends CreateGameDto {
  /**
   * The ID of the game being updated.
   *
   * @type {number}
   * @memberof UpdateGameDto
   */
  readonly gameId?: number;
  /**
   * The MessageTarget to be "actioned" on the game entity (e.g. added/removed/etc).
   *
   * @type {GameMessageTargetAction}
   * @memberof UpdateGameDto
   */
  readonly gameMessageTargetAction?: GameMessageTargetAction;
}
