import { Either, failurePromise } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { OsuUserFailure, banchoOsuUserIdIsInvalidFailure } from "../user/user.failure";
import { GameFailure } from "../game/game.failure";
import { TeamFailure } from "./team.failure";
import { Team } from "./team.entity";
import { PermissionsFailure } from "../../permissions/permissions.failure";
import { injectable, inject } from "inversify";
import TYPES from "../../types";
import { UserService } from "../user/user.service";
import { GameService } from "../game/game.service";
import { Permissions } from "../../permissions/permissions";
import { Log } from "../../utils/Log";
import { ColorPicker } from "../../utils/color-picker";
import { User } from "../user/user.entity";
import { RequestDto } from "../../requests/dto/request.dto";
import { Helpers } from "../../utils/helpers";

@injectable()
export class TeamService {
  constructor(
    @inject(TYPES.UserService) protected userService: UserService,
    @inject(TYPES.GameService) protected gameService: GameService,
    @inject(TYPES.Permissions) protected permissions: Permissions
  ) {
    Log.debug(`Initialized ${this.constructor.name}`);
  }

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
    requestingUser,
    requestDto
  }: {
    osuUsernamesOrIdsOrSeparators: string[];
    requestingUser: User;
    requestDto: RequestDto;
  }): Promise<Either<Failure<TeamFailure | OsuUserFailure | GameFailure | PermissionsFailure>, Team[]>> {
    try {
      // find the user's most recent game created, or !targetgame
      const targetGameResult = await this.gameService.getRequestingUserTargetGame({ userId: requestingUser.id });
      if (targetGameResult.failed()) {
        Log.methodFailure(this.processAddingNewTeams, this.constructor.name);
        return failurePromise(targetGameResult.value);
      }
      const game = targetGameResult.value;

      // ensure the requesting-user has permission to add a team to the target game
      const userRole = await this.gameService.getUserRoleForGame(requestingUser.id, game.id);
      const userPermittedResult = await this.permissions.checkUserPermission({
        user: requestingUser,
        userRole: userRole,
        action: "addteam",
        resource: "game",
        entityId: game.id,
        requesterClientType: requestDto.commType
      });
      if (userPermittedResult.failed()) {
        Log.methodFailure(
          this.processAddingNewTeams,
          this.constructor.name,
          `User ${requestingUser.id} does not have permission to add a team to game ${game.id}.`
        );
        return failurePromise(userPermittedResult.value);
      }

      // validate the osu usernames with bancho
      for (const item of osuUsernamesOrIdsOrSeparators) {
        if (Helpers.isAddTeamCommandSeparator(item)) continue;
        const valid: boolean = await this.userService.isValidBanchoOsuUserIdOrUsername(item);
        if (!valid) {
          return failurePromise(banchoOsuUserIdIsInvalidFailure(item));
        }
      }

      // validate the osu users are not already in a team for this game
      // validate the team structure (e.g. does the game require teams to be of a certain size)
      // create the osu users
      // create the team
      // assign a color to the team using ColorPicker
      // add the teams to the game
      throw new Error("TODO: Implement method of TeamService.");
    } catch (error) {
      Log.methodError(this.processAddingNewTeams, this.constructor.name, error);
      throw error;
    }
  }
}
