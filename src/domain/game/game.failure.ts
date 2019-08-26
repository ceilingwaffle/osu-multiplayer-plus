import { Failure } from "../../utils/Failure";
import { ValidationError } from "class-validator";
import { GameStatus } from "./game-status";

export enum GameFailure {
  InvalidGameProperties,
  CreatorUserLookupFailed,
  CreatorUserCreationFailed,
  GameNotFound,
  GameStatusNotAllowed,
  UserHasNotCreatedGame
}

export const invalidGamePropertiesFailure = (
  validationErrors: ValidationError[],
  reason?: string
): Failure<GameFailure.InvalidGameProperties> => ({
  type: GameFailure.InvalidGameProperties,
  validationErrors: validationErrors,
  reason: reason || "One or more game properties were invalid."
});

export const creatorUserLookupError = (error: Error, reason?: string): Failure<GameFailure.CreatorUserLookupFailed> => ({
  type: GameFailure.CreatorUserLookupFailed,
  reason: reason || "Something went wrong when we tried to find a user during the game creation.",
  error: error
});

export const creatorUserCreationError = (error: Error, reason?: string): Failure<GameFailure.CreatorUserCreationFailed> => ({
  type: GameFailure.CreatorUserCreationFailed,
  reason: reason || "Something went wrong when we tried to create a user during the game creation.",
  error: error
});

export const gameDoesNotExistFailure = (gameId: number): Failure<GameFailure.GameNotFound> => ({
  type: GameFailure.GameNotFound,
  reason: `A game does not exist matching game ID ${gameId}.`
});

export const gameCannotBeEndedDueToStatusFailure = (gameId: number, gameStatus: string): Failure<GameFailure.GameStatusNotAllowed> => ({
  type: GameFailure.GameStatusNotAllowed,
  reason: `Game with ID ${gameId} cannot be ended due to having a game status of '${GameStatus.getTextFromKey(gameStatus)}'.`
});

export const userHasNotCreatedGameFailure = (userId: number): Failure<GameFailure.UserHasNotCreatedGame> => ({
  type: GameFailure.UserHasNotCreatedGame,
  reason: `No games have been created by user ID ${userId}.`
});
