import { Failure } from "../../utils/Failure";
import { ValidationError } from "class-validator";

export enum UserFailure {
  UserLookupFailure,
  UserLookupError,
  UserCreationFailure,
  UserCreationError,
  UserUpdateFailure,
  UserUpdateError
}

export enum OsuUserFailure {
  InvalidCreationArguments,
  OsuUserLookupError,
  OsuUserCreationError,
  BanchoOsuUserIdIsInvalid,
  BanchoOsuUsernameIsInvalid
}

export enum DiscordUserFailure {
  InvalidCreationArguments,
  DiscordUserLookupError,
  DiscordUserCreationError
}

export enum WebUserFailure {}

export type UserFailureTypes = UserFailure | DiscordUserFailure | OsuUserFailure | WebUserFailure;

export const userLookupFailure = (userId?: number): Failure<UserFailure.UserLookupFailure> => ({
  type: UserFailure.UserLookupFailure,
  reason: userId ? `A user matching user ID ${userId} does not exist.` : `User does not exist.`
});

export const userLookupError = (error: Error, reason?: string): Failure<UserFailure.UserLookupError> => ({
  type: UserFailure.UserLookupError,
  reason: reason || "Something went wrong when we tried to find a user.",
  error: error
});

export const banchoOsuUserIdIsInvalidFailure = (userId?: string): Failure<OsuUserFailure.BanchoOsuUserIdIsInvalid> => ({
  type: OsuUserFailure.BanchoOsuUserIdIsInvalid,
  reason: userId ? `No osu! player could be found matching a user ID of ${userId}.` : `No osu! player found for osu! user ID.`
});

export const banchoOsuUsernameIsInvalidFailure = (username?: string): Failure<OsuUserFailure.BanchoOsuUsernameIsInvalid> => ({
  type: OsuUserFailure.BanchoOsuUsernameIsInvalid,
  reason: username ? `No osu! player could be found matching a username of ${username}.` : `No osu! player found for osu! username.`
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

export const userUpdateFailure = ({ userId, reason }: { userId: number; reason?: string }): Failure<UserFailure.UserUpdateFailure> => ({
  type: UserFailure.UserUpdateFailure,
  reason: reason || "Something went wrong when we tried to update a user."
});

export const userUpdateError = ({
  userId,
  error,
  reason
}: {
  userId: number;
  error: Error;
  reason?: string;
}): Failure<UserFailure.UserUpdateError> => ({
  type: UserFailure.UserUpdateError,
  reason: reason || "Something went wrong when we tried to update a user.",
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
