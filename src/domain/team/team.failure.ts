import { Failure } from "../../utils/failure";
import { ValidationError } from "class-validator";

export enum TeamFailure {
  InvalidTeamSize,
  OsuUsersAlreadyInTeamForThisGame,
  TooManyUsersInAddTeamsRequest,
  SamePlayerExistsInMultipleTeamsInAddTeamsRequest,
  InvalidTeamNumbersInRemoveTeamsRequest,
  TeamNumbersDoNotExistInGame,
  OsuUsersBeingAddedMultipleTimes
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

export const osuUsersBeingAddedMultipleTimesFailure = ({
  osuUsernames
}: {
  osuUsernames: string[];
}): Failure<TeamFailure.OsuUsersBeingAddedMultipleTimes> => ({
  type: TeamFailure.OsuUsersBeingAddedMultipleTimes,
  reason: (() => {
    if (osuUsernames.length === 1) {
      return `osu! user ${osuUsernames[0]} is trying to be added to multiple teams! Check if one of the usernames is an old username of the user.`;
    } else {
      return `osu! users ${osuUsernames.join(", ")} are trying to be added to multiple teams! Check if one of the usernames is an old username of the users.`;
    }
  })()
});

export const tooManyUsersInAddTeamsRequestFailure = ({
  maxAllowed
}: {
  maxAllowed: number;
}): Failure<TeamFailure.TooManyUsersInAddTeamsRequest> => ({
  type: TeamFailure.TooManyUsersInAddTeamsRequest,
  reason: (() => {
    return `You are adding too many players at once! The maximum number of players allowed in this request is ${maxAllowed}. \ 
            Try splitting the action up into several smaller commands.`;
  })()
});

export const samePlayerExistsInMultipleTeamsInAddTeamsRequestFailure = ({
  problemItems
}: {
  problemItems: string[];
}): Failure<TeamFailure.SamePlayerExistsInMultipleTeamsInAddTeamsRequest> => ({
  type: TeamFailure.SamePlayerExistsInMultipleTeamsInAddTeamsRequest,
  reason: (() => {
    const grammaticalNumberOfTheseUsers = problemItems.length === 1 ? "this player" : "these players";
    return `Players can only be added to one team per game. \
            You tried adding ${grammaticalNumberOfTheseUsers} to multiple teams: ${problemItems.join(", ")}`;
  })()
});

export const invalidTeamNumbersInRemoveTeamsRequestFailure = ({
  teamNumbers
}: {
  teamNumbers: number[];
}): Failure<TeamFailure.InvalidTeamNumbersInRemoveTeamsRequest> => ({
  type: TeamFailure.InvalidTeamNumbersInRemoveTeamsRequest,
  reason: (() => {
    return "Team numbers must be positive whole numbers.";
  })()
});

export const teamNumbersDoNotExistInGame = ({
  teamNumbers,
  gameId
}: {
  teamNumbers: number[];
  gameId: number;
}): Failure<TeamFailure.TeamNumbersDoNotExistInGame> => ({
  type: TeamFailure.TeamNumbersDoNotExistInGame,
  reason: (() => {
    return `Team numbers ${teamNumbers.join(", ")} do not exist in game ${gameId}.`;
  })()
});
