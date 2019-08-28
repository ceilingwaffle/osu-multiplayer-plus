import { UserReportProperties } from "../shared/reports/user-report-properties.type";
import { Lobby } from "./lobby.entity";
import { AbstractResponseFactory } from "../shared/abstract-response-factory";

export class LobbyResponseFactory extends AbstractResponseFactory<Lobby> {
  getAddedBy(): UserReportProperties {
    // GL:
    const gameLobby = this.subject.gameLobbies.find(gameLobby => gameLobby.lobby.id === this.subject.id);
    return this.getUserReportPropertiesForUser(gameLobby.addedBy);
  }

  getAddedAgoText(): string {
    // GL:
    const gameLobby = this.subject.gameLobbies.find(gameLobby => gameLobby.lobby.id === this.subject.id);
    return this.getTimeAgoTextForTime(gameLobby.createdAt);
  }

  getGameId(): number {
    // Use the game ID of the most recent game (the last game in the lobby-games array).
    // The Lobby service should have only returned a single game, but use the last game just in case.
    // GL:
    return this.subject.gameLobbies.map(gameLobby => gameLobby.game).slice(-1)[0].id;
  }

  getRemovedBy(): UserReportProperties {
    // GL:
    const gameLobby = this.subject.gameLobbies.find(gameLobby => gameLobby.lobby.id === this.subject.id);
    return this.getUserReportPropertiesForUser(gameLobby.removedBy);
  }

  getRemovedAgoText(): string {
    // GL:
    const gameLobby = this.subject.gameLobbies.find(gameLobby => gameLobby.lobby.id === this.subject.id);
    return this.getTimeAgoTextForTime(gameLobby.removedAt);
  }
}
