import { UserReportProperties } from "../shared/reports/user-report-properties.type";
import { AbstractResponseFactory } from "../shared/abstract-response-factory";
import { RemovedLobbyResult } from "./removed-lobby-result";

export class RemovedLobbyResponseFactory extends AbstractResponseFactory<RemovedLobbyResult> {
  getGameId(): number {
    return this.subject.gameIdRemovedFrom;
  }

  getRemovedBy(): UserReportProperties {
    // GL: return this.getUserReportPropertiesForUser(this.subject.lobby.removedBy);
    const gameLobby = this.subject.lobby.gameLobbies.find(gameLobby => gameLobby.game.id === this.subject.gameIdRemovedFrom);
    return this.getUserReportPropertiesForUser(gameLobby.removedBy);
  }

  getRemovedAgoText(): string {
    // GL: return this.getTimeAgoTextForTime(this.subject.lobby.removedAt);
    const gameLobby = this.subject.lobby.gameLobbies.find(gameLobby => gameLobby.game.id === this.subject.gameIdRemovedFrom);
    return this.getTimeAgoTextForTime(gameLobby.removedAt);
  }
}
