import { Failure } from "../../utils/failure";
import { ValidationError } from "class-validator";

export enum LobbyFailure {
  LobbyCreationError,
  LobbyCreationFailure,
  InvalidCreationArguments,
  BanchoMultiplayerIdAlreadyAssociatedWithGameFailure,
  LobbyNotFound,
  LobbyRemovalFailure,
  InvalidLobbyStatusFailure
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
  reason: [`The multiplayer ID of ${banchoMultiplayerId} has already been added to game ID ${gameId}.`, additionalErrorMessageText].join(
    " "
  )
});

export const lobbyDoesNotExistFailure = (reason?: string): Failure<LobbyFailure.LobbyNotFound> => ({
  type: LobbyFailure.LobbyNotFound,
  reason: reason || "Lobby not found."
});

export const lobbyRemovalFailure = (reason?: string): Failure<LobbyFailure.LobbyRemovalFailure> => ({
  type: LobbyFailure.LobbyRemovalFailure,
  reason: reason || "Something went wrong when we tried to remove a lobby."
});

export const invalidLobbyStatusFailure = (reason?: string): Failure<LobbyFailure.InvalidLobbyStatusFailure> => ({
  type: LobbyFailure.InvalidLobbyStatusFailure,
  reason: reason || "Invalid lobby status."
});
