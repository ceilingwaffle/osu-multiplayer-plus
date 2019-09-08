import { Either } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { UserFailure } from "../user/user.failure";
import { Lobby } from "../lobby/lobby.entity";

export class TeamService {
  /**
   * Attempts to add a new team to a game, and creates all OsuUsers that make up the teams
   *
   * @param {string[]} osuUsernamesOrIds
   * @param {number} userId
   * @returns {(Promise<Either<Failure<TeamFailure | UserFailure>, Lobby>>)}
   * @memberof TeamService
   */
  async processTeamAdd({
    osuUsernamesOrIdsOrSeparators,
    userId
  }: {
    osuUsernamesOrIdsOrSeparators: string[];
    userId: number;
  }): Promise<Either<Failure<UserFailure>, Lobby>> {
    // TeamFailure |
    // validate the team structure (e.g. does the game require teams to be of a certain size)
    // validate the osu usernames
    // create the osu users
    // find the user's most recent game created, or !targetgame
    // add the teams to the game
    throw new Error("Method not implemented.");
  }
}
