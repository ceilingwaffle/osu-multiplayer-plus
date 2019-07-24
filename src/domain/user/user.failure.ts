import { Failure } from "../../utils/Failure";
import { ValidationError } from "class-validator";

export enum UserFailure {
  UserLookupFailure,
  UserLookupError,
  UserCreationFailure,
  UserCreationError
}

export enum OsuUserFailure {
  InvalidCreationArguments,
  OsuUserLookupError,
  OsuUserCreationError
}

export enum DiscordUserFailure {
  InvalidCreationArguments,
  DiscordUserLookupError,
  DiscordUserCreationError
}

export enum WebUserFailure {}

export type UserFailureTypes = UserFailure | DiscordUserFailure | OsuUserFailure | WebUserFailure;

export const userLookupFailure = (reason?: string): Failure<UserFailure.UserLookupFailure> => ({
  type: UserFailure.UserLookupFailure,
  reason: reason || "Something went wrong when we tried to find a user."
});

export const userLookupError = (error: Error, reason?: string): Failure<UserFailure.UserLookupError> => ({
  type: UserFailure.UserLookupError,
  reason: reason || "Something went wrong when we tried to find a user.",
  error: error
});

export const userCreationFailure = (reason?: string): Failure<UserFailure.UserCreationFailure> => ({
  type: UserFailure.UserCreationFailure,
  reason: reason || "Something went wrong when we tried to create a user."
});

export const userCreationError = (error: Error, reason?: string): Failure<UserFailure.UserLookupError> => ({
  type: UserFailure.UserLookupError,
  reason: reason || "Something went wrong when we tried to create a user.",
  error: error
});

export const invalidOsuUserCreationArgumentsFailure = (
  validationErrors: ValidationError[],
  reason?: string
): Failure<OsuUserFailure.InvalidCreationArguments> => ({
  type: OsuUserFailure.InvalidCreationArguments,
  validationErrors: validationErrors,
  reason: reason || "One or more osu! user arguments were invalid."
});

export const osuUserLookupError = (error: Error, reason?: string): Failure<OsuUserFailure.OsuUserLookupError> => ({
  type: OsuUserFailure.OsuUserLookupError,
  reason: reason || "Something went wrong when we tried to find an osu! user.",
  error: error
});

export const osuUserCreationError = (error: Error, reason?: string): Failure<OsuUserFailure.OsuUserCreationError> => ({
  type: OsuUserFailure.OsuUserCreationError,
  reason: reason || "Something went wrong when we tried to create an osu! user.",
  error: error
});

export const invalidDiscordUserCreationArgumentsFailure = (
  validationErrors: ValidationError[],
  reason?: string
): Failure<DiscordUserFailure.InvalidCreationArguments> => ({
  type: DiscordUserFailure.InvalidCreationArguments,
  validationErrors: validationErrors,
  reason: reason || "One or more Discord user arguments were invalid."
});

export const discordUserLookupError = (error: Error, reason?: string): Failure<DiscordUserFailure.DiscordUserLookupError> => ({
  type: DiscordUserFailure.DiscordUserLookupError,
  reason: reason || "Something went wrong when we tried to find a Discord user.",
  error: error
});

export const discordUserCreationError = (error: Error, reason?: string): Failure<DiscordUserFailure.DiscordUserCreationError> => ({
  type: DiscordUserFailure.DiscordUserCreationError,
  reason: reason || "Something went wrong when we tried to create a Discord user.",
  error: error
});