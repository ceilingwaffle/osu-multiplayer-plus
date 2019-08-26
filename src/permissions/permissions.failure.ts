import { Failure } from "../utils/Failure";

export enum PermissionsFailure {
  UserPermissionsFailure
}

export type PermissionsFailureTypes = PermissionsFailure;

export const userDoesNotHavePermissionsFailure = (reason?: string): Failure<PermissionsFailure.UserPermissionsFailure> => ({
  type: PermissionsFailure.UserPermissionsFailure,
  reason: reason || "Permission denied for the requested action."
});
