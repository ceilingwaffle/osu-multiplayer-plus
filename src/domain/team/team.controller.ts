import { inject } from "inversify";
import { TeamService } from "./team.service";
import { RequestDto } from "../../requests/dto";
import { AddTeamDto } from "./dto/add-team.dto";
import { Response } from "../../requests/Response";
import { AddTeamReport } from "./reports/add-team.report";
import { Log } from "../../utils/Log";
import { Requester } from "../../requests/requesters/requester";
import { RequesterFactory } from "../../requests/requester-factory";
import { RequesterFactoryInitializationError } from "../shared/errors/RequesterFactoryInitializationError";
import { Message } from "../../utils/message";

export class TeamController {
  constructor(@inject(TeamService) protected readonly teamService: TeamService) {}

  async create(teamData: { teamDto: AddTeamDto; requestDto: RequestDto }): Promise<Response<AddTeamReport>> {
    try {
      // TODO: Validate the osu usernames/ids

      // build the requester
      const requester: Requester = RequesterFactory.initialize(teamData.requestDto);
      if (!requester) throw new RequesterFactoryInitializationError(this.constructor.name, this.create.name);

      // TODO: Use TeamService to create the team

      throw new Error("Method not implemented.");

      // return {
      //   success: true,
      //   message: Message.get("teamCreateSuccess"),
      //   result: {
      //     teamId: 1,
      //     gameId: 1,
      //     teamOsuUsernames: ["Aaron", "Bob"],
      //     addedBy: { discordUserId: "discordUser1" },
      //     addedAgo: "moments ago"
      //   }
      // };
    } catch (error) {
      Log.methodError(this.create, this.constructor.name, error);
      throw error;
    }
  }
}
