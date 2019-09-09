import { Failure } from "../../utils/Failure";
import { ValidationError } from "class-validator";

export enum TeamFailure {
  InvalidTeamSize,
  OsuUsersAlreadyInTeamForThisGame
}

export const invalidTeamSizeFailure = (validationErrors: ValidationError[], reason?: string): Failure<TeamFailure.InvalidTeamSize> => ({
  type: TeamFailure.InvalidTeamSize,
  validationErrors: validationErrors,
  reason: reason || "One or more teams does not contain the required number of players for this game."
});

export const osuUsersAlreadyInTeamForThisGameFailure = (
  osuUsernamesOrIds: string[]
): Failure<TeamFailure.OsuUsersAlreadyInTeamForThisGame> => ({
  type: TeamFailure.OsuUsersAlreadyInTeamForThisGame,
  reason: `osu! users ${osuUsernamesOrIds.join(", ")} have already been added to a team for this game.`
});
