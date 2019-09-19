import { TYPES } from "../types";
import getDecorators from "inversify-inject-decorators";
import iocContainer from "../inversify.config";
const { lazyInject } = getDecorators(iocContainer);
import { ApiMultiplayer } from "../osu/types/api-multiplayer";
import { MatchReport } from "./reports/match.report";
import { UserService } from "../domain/user/user.service";
import { TeamService } from "../domain/team/team.service";
import { Log } from "../utils/Log";

export class MultiplayerResultsProcessor {
  @lazyInject(TYPES.UserService) private gameService: UserService;
  @lazyInject(TYPES.TeamService) private teamService: TeamService;

  constructor(protected readonly input: ApiMultiplayer) {
    Log.info(`Initialized ${this.constructor.name}.`);
  }

  async process(): Promise<MatchReport[]> {
    throw new Error("Method not implemented.");
  }
}
