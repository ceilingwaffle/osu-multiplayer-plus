import { Failure } from "../utils/failure";

export enum DiscordApiFailure {}

export enum DiscordPermissionsFailure {
  NotPermittedManageChannels
}

export enum DiscordGeneralError {
  UnexpectedChannelTypeFailure
}

export type DiscordFailureTypes = DiscordApiFailure | DiscordPermissionsFailure | DiscordGeneralError;

export const notPermittedManageChannelsFailure = (): Failure<DiscordPermissionsFailure.NotPermittedManageChannels> => ({
  type: DiscordPermissionsFailure.NotPermittedManageChannels,
  reason: `The bot requires the "Manage Channels" role to work correctly.`
});

export const unexpectedChannelTypeFailure = (): Failure<DiscordGeneralError.UnexpectedChannelTypeFailure> => ({
  type: DiscordGeneralError.UnexpectedChannelTypeFailure,
  reason: `The bot requires the "Manage Channels" role to work correctly.`
});
