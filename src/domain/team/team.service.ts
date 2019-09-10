import { Either } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { OsuUserFailure } from "../user/user.failure";
import { GameFailure } from "../game/game.failure";
import { TeamFailure } from "./team.failure";
import { Team } from "./team.entity";
import { PermissionsFailure } from "../../permissions/permissions.failure";
import { injectable } from "inversify";

@injectable()
export class TeamService {
  /**
   * Attempts to add a new team to a game after creating all osu user entities that make up the teams.
   *
   * @param {{
   *     osuUsernamesOrIdsOrSeparators: string[];
   *     userId: number;
   *   }} {
   *     osuUsernamesOrIdsOrSeparators,
   *     userId
   *   }
   * @returns {(Promise<Either<Failure<TeamFailure | OsuUserFailure | GameFailure>, Lobby>>)}
   */
  async processAddingNewTeams({
    osuUsernamesOrIdsOrSeparators,
    userId
  }: {
    osuUsernamesOrIdsOrSeparators: string[];
    userId: number;
  }): Promise<Either<Failure<TeamFailure | OsuUserFailure | GameFailure | PermissionsFailure>, Team[]>> {
    // find the user's most recent game created, or !targetgame
    // validate the requesting-user has permission to add a team to this game
    // validate the osu usernames with bancho
    // validate the osu users are not already in a team for this game
    // validate the team structure (e.g. does the game require teams to be of a certain size)
    // create the osu users
    // add the teams to the game
    throw new Error("TODO: Implement method of TeamService.");
  }
}
