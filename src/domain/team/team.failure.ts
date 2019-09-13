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

export const osuUsersAlreadyInTeamForThisGameFailure = ({
  osuUsernames,
  gameId
}: {
  osuUsernames: string[];
  gameId: number;
}): Failure<TeamFailure.OsuUsersAlreadyInTeamForThisGame> => ({
  type: TeamFailure.OsuUsersAlreadyInTeamForThisGame,
  reason: (() => {
    if (osuUsernames.length === 1) {
      return `osu! user ${osuUsernames[0]} has already been added to a team in game ${gameId}.`;
    } else {
      return `osu! users ${osuUsernames.join(", ")} have already been added to a team in game ${gameId}.`;
    }
  })()
});
