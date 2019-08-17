import { Failure } from "../../utils/Failure";
import { ValidationError } from "class-validator";

export enum LobbyFailure {
  LobbyCreationError,
  LobbyCreationFailure,
  InvalidCreationArguments,
  BanchoMultiplayerIdAlreadyAssociatedWithGameFailure
}

export type LobbyFailureTypes = LobbyFailure;

export const lobbyCreationFailure = (reason?: string): Failure<LobbyFailure.LobbyCreationFailure> => ({
  type: LobbyFailure.LobbyCreationFailure,
  reason: reason || "Something went wrong when we tried to add a lobby."
});

export const lobbyCreationError = (error: Error, reason?: string): Failure<LobbyFailure.LobbyCreationError> => ({
  type: LobbyFailure.LobbyCreationError,
  reason: reason || "Something went wrong when we tried to add a lobby.",
  error: error
});

export const invalidLobbyCreationArgumentsFailure = (
  validationErrors: ValidationError[],
  reason?: string
): Failure<LobbyFailure.InvalidCreationArguments> => ({
  type: LobbyFailure.InvalidCreationArguments,
  validationErrors: validationErrors,
  reason: reason || "One or more lobby arguments were invalid."
});

export const banchoMultiplayerIdAlreadyAssociatedWithGameFailure = (
  banchoMultiplayerId: string,
  gameId: number,
  additionalErrorMessageText?: string
): Failure<LobbyFailure.BanchoMultiplayerIdAlreadyAssociatedWithGameFailure> => ({
  type: LobbyFailure.BanchoMultiplayerIdAlreadyAssociatedWithGameFailure,
  reason: [
    `The multiplayer ID of ${banchoMultiplayerId} has already been associated with game ID ${gameId}.`,
    additionalErrorMessageText
  ].join(" ")
});
