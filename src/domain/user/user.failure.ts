import { Failure } from "../../utils/Failure";

export enum UserFailure {
  UserLookupError = "User Lookup Error",
  UserCreationError = "User Creation Error",
  OsuUserLookupError = "Osu User Lookup Error",
  OsuUserCreationError = "Osu User Creation Error"
}

export const userLookupError = (error: Error, reason?: string): Failure<UserFailure.UserLookupError> => ({
  type: UserFailure.UserLookupError,
  reason: reason || "Something went wrong when we tried to find a user.",
  error: error
});

export const userCreationError = (error: Error, reason?: string): Failure<UserFailure.UserLookupError> => ({
  type: UserFailure.UserLookupError,
  reason: reason || "Something went wrong when we tried to create a user.",
  error: error
});

export const osuUserLookupError = (error: Error, reason?: string): Failure<UserFailure.OsuUserLookupError> => ({
  type: UserFailure.OsuUserLookupError,
  reason: reason || "Something went wrong when we tried to find an osu user.",
  error: error
});

export const osuUserCreationError = (error: Error, reason?: string): Failure<UserFailure.OsuUserCreationError> => ({
  type: UserFailure.OsuUserCreationError,
  reason: reason || "Something went wrong when we tried to create an osu user.",
  error: error
});
