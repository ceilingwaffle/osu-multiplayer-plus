import { UserReportProperties } from "../shared/reports/user-report-properties.type";
import { Lobby } from "./lobby.entity";
import { AbstractResponseFactory } from "../shared/abstract-response-factory";

export class LobbyResponseFactory extends AbstractResponseFactory<Lobby> {
  getAddedBy(): UserReportProperties {
    return this.getUserReportPropertiesForUser(this.entity.addedBy);
  }

  getAddedAgoText(): string {
    return this.getTimeAgoTextForTime(this.entity.createdAt);
  }

  getGameId(): number {
    // Use the game ID of the most recent game (the last game in the lobby-games array).
    // The Lobby service should have only returned a single game, but use the last game just in case.
    return this.entity.games.slice(-1)[0].id;
  }
}
