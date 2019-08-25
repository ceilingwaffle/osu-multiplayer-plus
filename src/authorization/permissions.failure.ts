import { Failure } from "../utils/Failure";
import { User } from "../domain/user/user.entity";
import { Role } from "../domain/roles/role.type";

export enum PermissionsFailure {
  UserPermissionsFailure
}

export type PermissionsFailureTypes = PermissionsFailure;

export const userDoesNotHavePermissionsFailure = (
  user: User,
  hasRole: Role,
  needsMinimumRole: Role,
  attemptedAction: string,
  targetedResource: string,
  message?: string
): Failure<PermissionsFailure.UserPermissionsFailure> => ({
  type: PermissionsFailure.UserPermissionsFailure,
  reason: `User ID ${
    user.id
  } is a ${hasRole} but needs to be at least a ${needsMinimumRole} to perform ${attemptedAction} on ${targetedResource}.`.concat(
    ` ${message}.`
  )
});
// CommunicationClientType
