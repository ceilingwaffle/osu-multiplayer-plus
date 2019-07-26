import { Failure } from "../../utils/Failure";
import { ValidationError } from "class-validator";

export enum GameFailure {
  InvalidCreationArguments,
  CreatorUserLookupFailed,
  CreatorUserCreationFailed,
  GameNotFound
}

export const invalidCreationArgumentsFailure = (
  validationErrors: ValidationError[],
  reason?: string
): Failure<GameFailure.InvalidCreationArguments> => ({
  type: GameFailure.InvalidCreationArguments,
  validationErrors: validationErrors,
  reason: reason || "One or more game arguments were invalid."
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

export const gameDoesNotExistFailure = (reason?: string): Failure<GameFailure.GameNotFound> => ({
  type: GameFailure.GameNotFound,
  reason: reason || "Game not found."
});
