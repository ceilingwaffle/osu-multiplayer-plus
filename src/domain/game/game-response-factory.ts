import { UserReportProperties } from "../shared/reports/user-report-properties.type";
import { Game } from "./game.entity";
import { GameMessageTarget } from "./game-message-target";
import { AbstractResponseFactory } from "../shared/abstract-response-factory";
// import { UserGameRoleRepository } from "../role/user-game-role.repository";
// import { getCustomRepository } from "typeorm";
import { gameAdminRoles, getRefereeTypeRoles } from "../role/role.type";

export class GameResponseFactory extends AbstractResponseFactory<Game> {
  // protected readonly userGameRoleRepository: UserGameRoleRepository = getCustomRepository(UserGameRoleRepository);

  getCreator(): UserReportProperties {
    return this.getUserReportPropertiesForUser(this.subject.createdBy);
  }

  getEndedBy(): UserReportProperties {
    return this.getUserReportPropertiesForUser(this.subject.endedBy);
  }

  getStartedBy(): UserReportProperties {
    return this.getUserReportPropertiesForUser(this.subject.startedBy);
  }

  // async getReferees(): Promise<UserReportProperties[]> {
  //   const referees = await this.userGameRoleRepository.getGameReferees(this.subject.id);
  //   return referees.map(user => this.getUserReportPropertiesForUser(user));
  // }

  getReferees(): UserReportProperties[] {
    return this.subject.userGameRoles
      .filter(ugr => getRefereeTypeRoles().includes(ugr.role))
      .map(ugr => this.getUserReportPropertiesForUser(ugr.user));
  }

  getMessageTargets(): GameMessageTarget[] {
    return this.subject.messageTargets;
  }

  getCreatedAgoText(): string {
    return this.getTimeAgoTextForTime(this.subject.createdAt);
  }

  getEndedAgoText(): string {
    return this.getTimeAgoTextForTime(this.subject.endedAt);
  }

  getStartedAgoText(): string {
    return this.getTimeAgoTextForTime(this.subject.startedAt);
  }
}
