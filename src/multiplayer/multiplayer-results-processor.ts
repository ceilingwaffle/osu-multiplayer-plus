import { ApiMultiplayer } from "../osu/types/api-multiplayer";
import { MatchReport } from "./reports/match.report";
import { UserService } from "../domain/user/user.service";
import iocContainer from "../inversify.config";
import * as entities from "../inversify.entities";
import { TeamService } from "../domain/team/team.service";

export class MultiplayerResultsProcessor {
  protected readonly userService: UserService = iocContainer.get(entities.UserService);
  protected readonly teamService: TeamService = iocContainer.get(entities.TeamService);

  constructor(protected readonly input: ApiMultiplayer) {}

  async process(): Promise<MatchReport> {
    throw new Error("Method not implemented.");
  }
}
