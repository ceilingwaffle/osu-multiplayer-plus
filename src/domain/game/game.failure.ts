import { Failure } from "../../utils/Failure";

export enum GameFailure {
  InvalidCreationArguments,
  CreatorUserLookupFailed,
  CreatorUserCreationFailed
}

export const invalidCreationArgumentsFailure = (reason?: string): Failure<GameFailure.InvalidCreationArguments> => ({
  type: GameFailure.InvalidCreationArguments,
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
