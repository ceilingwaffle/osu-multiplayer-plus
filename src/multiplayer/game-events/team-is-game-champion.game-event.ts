import { GameEvent } from "./classes/game-event";
import { IGameEvent } from "./interfaces/game-event-interface";
import { GameEventType } from "./types/game-event-types";
import { Game } from "../../domain/game/game.entity";
import { VirtualMatch } from "../virtual-match/virtual-match";
import { VirtualMatchCreator } from "../virtual-match/virtual-match-creator";
import iocContainer from "../../../src/inversify.config";
import { GameService } from "../../domain/game/game.service";
import TYPES from "../../types";
import { Connection } from "typeorm";
import { IDbClient } from "../../database/db-client";
import { DiscordUserRepository } from "../../domain/user/discord-user.repository";
import { Log } from "../../utils/log";
import { Team } from "../../domain/team/team.entity";

export class TeamIsGameChampionGameEvent extends GameEvent<{ team: Team }> implements IGameEvent {
  newify() {
    return new TeamIsGameChampionGameEvent();
  }

  type: GameEventType = "team_game_champion_declared";

  protected gameService = iocContainer.get<GameService>(TYPES.GameService);
  protected dbClient: IDbClient = iocContainer.get<IDbClient>(TYPES.IDbClient);
  protected dbConn: Connection = this.dbClient.getConnection();

  private game: Game;

  happenedIn({
    game,
    targetVirtualMatch,
    allVirtualMatches
  }: {
    game: Game;
    targetVirtualMatch: VirtualMatch;
    allVirtualMatches: VirtualMatch[];
  }): boolean {
    // if virtual match incomplete, no team scores are ready yet for this virtual match
    if (targetVirtualMatch.lobbies.remaining.length) return false;
    if (!game || !game.gameTeams || !game.gameTeams.length) return false;

    const teams = game.gameTeams.map(gt => gt.team);
    if (!teams.length) return false;

    this.game = game;

    // a team wins a game when it is the only team with greater than 0 lives remaining
    const { losingTeamsForVirtualMatches, teamStatusForTargetVirtualMatch } = this.getLosingTeamsForVirtualMatches({
      targetVirtualMatch,
      allVirtualMatches,
      game
    });

    const teamLives = this.getCurrentTeamLivesForVirtualMatches(game, teams, losingTeamsForVirtualMatches);
    const aliveTeamIds = Array.from(teamLives).filter(t => t[1].lives > 0).map(t => t[0]); //prettier-ignore
    const winningTeamId: number = aliveTeamIds.length === 1 ? aliveTeamIds[0] : undefined;

    this.data = {
      eventMatch: targetVirtualMatch,
      timeOfEvent: VirtualMatchCreator.getEstimatedTimeOfOccurrenceOfVirtualMatch(targetVirtualMatch),
      team: teams.find(t => t.id === winningTeamId),
      game: game
    };

    return !!winningTeamId;
  }

  async after(): Promise<void> {
    try {
      // End the game (since a game champion has now been declared.)
      const discordBotDiscordUser = await this.dbConn.manager.getCustomRepository(DiscordUserRepository).getOrCreateDiscordBotUser();
      const discordBotUser = discordBotDiscordUser.user;
      if (!this.game.id)
        throw new Error(
          `No game has been defined for this event. Should have been set in ${this.happenedIn.name} before calling ${this.after.name}`
        );
      const endGameResponse = await this.gameService.endGame({ gameDto: { gameId: this.game.id }, endedByUser: discordBotUser });
      if (endGameResponse.failed()) {
        Log.warn(`Failed to end game ${this.game.id} after GameEvent processing.`, this.after.name, this.constructor.name);
        return;
      }
      Log.methodSuccess(this.after, this.constructor.name, `Game ${this.game.id} successfully ended after GameEvent processing.`);
    } catch (error) {
      Log.methodError(this.after, this.constructor.name, error);
      throw error;
    }
  }
}
