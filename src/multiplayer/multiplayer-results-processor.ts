import iocContainer from "../inversify.config";
import getDecorators from "inversify-inject-decorators";
import { TYPES } from "../types";
const { lazyInject } = getDecorators(iocContainer);
import { ApiMultiplayer } from "../osu/types/api-multiplayer";
import { GameReport } from "./reports/game.report";
import { UserService } from "../domain/user/user.service";
import { Log } from "../utils/Log";
import { LobbyRepository } from "../domain/lobby/lobby.repository";
import { Connection } from "typeorm";
import { LobbyService } from "../domain/lobby/lobby.service";
import { Lobby } from "../domain/lobby/lobby.entity";
import { Match } from "../domain/match/match.entity";
import { PlayerScore } from "../domain/score/player-score.entity";
import { OsuUser } from "../domain/user/osu-user.entity";
import { OsuUserRepository } from "../domain/user/osu-user.repository";
import { IOsuApiFetcher } from "../osu/interfaces/osu-api-fetcher";
import { IDbClient } from "../database/db-client";
import { GameEventRegistrarCollection } from "./game-events/game-event-registrar-collection";
import { GameEvent } from "./game-events/game-event";
import { Game } from "../domain/game/game.entity";
import { GameStatus } from "../domain/game/game-status";
import { GameEventRegistrar } from "./game-events/game-event-registrar";
import { GameLobby } from "../domain/game/game-lobby.entity";
import { Helpers } from "../utils/helpers";
import cloneDeep = require("lodash/cloneDeep");
import groupBy = require("lodash/groupBy");
import _ = require("lodash"); // do not convert to default import!!

interface MatchResult {
  beatmapId: string;
  matchId: number;
  startTime: number;
  lobbyId: number;
}

interface SameMapsInManyLobbies {
  [beatmapId: string]: MatchResult[];
}

const getSameMapsInManyLobbies = (dictionary: SameMapsInManyLobbies): MatchResult[][] => {
  var values: MatchResult[][] = [];
  for (var prop in dictionary) {
    if (dictionary.hasOwnProperty(prop)) {
      values.push(dictionary[prop]);
    }
  }
  return values;
};

export class MultiplayerResultsProcessor {
  // @lazyInject(TYPES.UserService) private userService: UserService;
  // @lazyInject(TYPES.TeamService) private teamService: TeamService;
  // @lazyInject(TYPES.LobbyService) private lobbyService: LobbyService;
  // TODO: Don't get these from the ioc container - should be able to inject somehow
  private userService: UserService = iocContainer.get<UserService>(TYPES.UserService);
  private lobbyService: LobbyService = iocContainer.get<LobbyService>(TYPES.LobbyService);
  private osuApi: IOsuApiFetcher = iocContainer.get<IOsuApiFetcher>(TYPES.IOsuApiFetcher);
  // protected readonly lobbyRepository: LobbyRepository = getCustomRepository(LobbyRepository);
  // protected readonly osuUserRepository: OsuUserRepository = getCustomRepository(OsuUserRepository);

  protected dbClient: IDbClient = iocContainer.get<IDbClient>(TYPES.IDbClient);
  protected dbConn: Connection = this.dbClient.getConnection();

  protected isProcessed: boolean;

  constructor(protected readonly input: ApiMultiplayer) {
    Log.info(`Initialized ${this.constructor.name}.`);
  }

  /**
   * Takes multiplayer results from the osu API and creates and saves database entities from those results.
   *
   * @returns {Promise<Game[]>} - The games (active games) that have added the lobby owner of the ApiMultiplayer input data.
   * @memberof MultiplayerResultsProcessor
   */
  async saveMultiplayerEntities(): Promise<Game[]> {
    try {
      // ensure required API data exists
      this.validateApiResultsInput();

      // get existing entities from DB
      //    find lobby using input.multiplayerId
      let lobby: Lobby = await this.dbConn.manager.getCustomRepository(LobbyRepository).findOne(
        { banchoMultiplayerId: this.input.multiplayerId },
        {
          relations: [
            "gameLobbies",
            "gameLobbies.game",
            "matches",
            "matches.playerScores",
            "matches.playerScores.scoredBy",
            "matches.playerScores.scoredBy.user"
          ]
        }
      );
      //      create lobby if not found
      if (!lobby) {
        lobby = this.lobbyService.create({ banchoMultiplayerId: this.input.multiplayerId });
      }

      const players: OsuUser[] = [];

      //    find matches using Lobby.Match[].startTime + Lobby.banchoMultiplayerId
      //    (this can only produce duplicate results if two matches in the same lobby start at the same time
      //         - safe to assume this is impossible, unless the osu API royally messes up)
      for (const apiMatch of this.input.matches) {
        let match: Match = lobby.matches.find(
          lobbyMatch =>
            lobbyMatch.startTime === apiMatch.startTime &&
            lobby.banchoMultiplayerId === this.input.multiplayerId &&
            lobbyMatch.beatmapId === apiMatch.multiplayerId
        );
        if (!match) {
          //      create match if not found
          // TODO: Extract match creation to MatchService
          match = new Match();
          match.aborted = false; // TODO
          match.beatmapId = apiMatch.mapId.toString();
          match.endTime = apiMatch.endTime;
          match.ignored = false; // TODO
          match.lobby = lobby;
          match.mapNumber = apiMatch.mapNumber;
          match.playerScores = [];
          match.startTime = apiMatch.startTime;
          match.teamMode = apiMatch.teamMode;
          lobby.matches.push(match);
        }

        for (const apiScore of apiMatch.scores) {
          //    find scores using Lobby.Match[].startTime + Lobby.Match.PlayerScores[].scoredBy(OsuUser).osuUserId + Lobby.Match.PlayerScores[].score (including score and bmid here is just for increased safety, in case two matches have the same startTime for some weird reason)
          let score: PlayerScore = match.playerScores.find(
            score =>
              match.startTime === apiMatch.startTime &&
              score.scoredBy.osuUserId === apiScore.osuUserId &&
              score.score === apiScore.score &&
              match.beatmapId === apiMatch.mapId
          );
          //      create score if not found
          if (!score) {
            //      find player using Lobby.Match[].PlayerScores[].scoredBy(OsuUser).osuUserId
            let player: OsuUser;
            if (!player) {
              player = lobby.matches
                .map(match => match.playerScores)
                .map(scores => scores.find(score => score.scoredBy.osuUserId === apiScore.osuUserId))
                .map(score => {
                  if (score) return score.scoredBy;
                })[0];
            }
            if (!player) {
              //      find player in DB
              player = await this.dbConn.manager.getCustomRepository(OsuUserRepository).findOne({ osuUserId: apiScore.osuUserId });
            }
            if (!player) {
              //        get the player's osu username from the osu API
              const apiOsuUser = await this.osuApi.getUserDataForUserId(apiScore.osuUserId);
              //        create player if not found
              player = this.userService.createOsuUser({
                userId: apiOsuUser.userId,
                username: apiOsuUser.username, // TODO: Handle user's changing username - maybe a nightly cron job to update active users?
                countryCode: apiOsuUser.country
              });
              player.user = this.userService.createUser({});
            }
            if (player && !players.find(p => p.osuUserId === player.osuUserId)) {
              // remember seen players to avoid creating duplicates
              players.push(player);
            }

            // TODO: Extract PlayerScore creation to a service class
            score = new PlayerScore();
            score.ignored = false; // TODO
            score.passed = apiScore.passed;
            score.score = apiScore.score;
            score.scoredBy = player;
            score.scoredInMatch = match;
            match.playerScores.push(score);
          }
        }
      }

      // save/update (cascade) entities
      // TODO: ensure Lobby.GameLobbies isn't being erased - if it is, just add it to the relations when finding lobby
      const savedLobby = await lobby.save();
      const reloadedLobby: Lobby = await this.dbConn.manager.getCustomRepository(LobbyRepository).findOne(
        { banchoMultiplayerId: this.input.multiplayerId },
        {
          relations: [
            "gameLobbies",
            "gameLobbies.game",
            "gameLobbies.game.gameTeams",
            "gameLobbies.game.gameTeams.team",
            "gameLobbies.game.gameTeams.team.teamOsuUsers",
            "gameLobbies.game.gameTeams.team.teamOsuUsers.osuUser",
            "gameLobbies.game.gameLobbies",
            "gameLobbies.game.gameLobbies.lobby",
            "gameLobbies.game.gameLobbies.lobby.matches",
            "gameLobbies.game.gameLobbies.lobby.matches.lobby",
            "gameLobbies.game.gameLobbies.lobby.matches.lobby.matches",
            "gameLobbies.game.gameLobbies.lobby.matches.playerScores",
            "gameLobbies.game.gameLobbies.lobby.matches.playerScores.scoredBy",
            "gameLobbies.game.gameLobbies.lobby.matches.playerScores.scoredBy.user"
          ]
        }
      );
      this.markAsProcessed();
      Log.methodSuccess(this.saveMultiplayerEntities, this.constructor.name);
      const multiplayerGames: Game[] = reloadedLobby.gameLobbies.map(gl => gl.game).filter(g => GameStatus.isStartedStatus(g.status));
      return multiplayerGames;
    } catch (error) {
      Log.methodError(this.saveMultiplayerEntities, this.constructor.name, error);
      throw error;
    }
  }

  private validateApiResultsInput() {
    if (!this.input.multiplayerId) {
      throw new Error("Multiplayer API result did not contain a multiplayer ID.");
    }
  }

  private markAsProcessed() {
    this.isProcessed = true;
  }

  a(): void {}

  processMatchResults(
    game: Game
  ): {
    beatmapId: string;
    matches: Match[];
    lobbies: {
      // lobbies that have *p*layed this map
      Lp: Lobby[];
      // lobbies *r*emaining to play this map
      Lr: Lobby[];
      // the *b*iggest number of times a lobby has played this map
      Lb: number;
    };
  }[] {
    const processed = _(game.gameLobbies)
      .map(gameLobby => gameLobby.lobby)
      .map(lobby => lobby.matches)
      .flattenDeep()
      .sortBy(match => match.startTime)
      .groupBy(match => match.beatmapId)
      .map((matches, matchesKey) => ({
        beatmapId: matchesKey,
        matches: matches,
        lobbies: game.gameLobbies.map(gl => gl.lobby).filter(l => l.matches.find(m => matches.find(om => om.beatmapId === m.beatmapId)))
      }))
      .map(o => {
        const lb = Math.max(0, ...o.matches.map(m => m.lobby.matches.filter(lm => lm.beatmapId === m.beatmapId).length));
        return {
          beatmapId: o.beatmapId,
          matches: o.matches,
          lobbies: {
            Lp: o.lobbies,
            Lr: game.gameLobbies.map(gl => gl.lobby).filter(l => l.matches.filter(lm => lm.beatmapId === o.beatmapId).length < lb),
            Lb: lb
          }
        };
      })
      .value();

    return processed;
  }

  groupBeatmapsBetweenManyLobbies(game: Game): SameMapsInManyLobbies {
    const sameMapsInManyLobbies: SameMapsInManyLobbies = {};

    for (const gameLobby of game.gameLobbies) {
      for (const match of gameLobby.lobby.matches) {
        if (!sameMapsInManyLobbies[match.beatmapId]) {
          sameMapsInManyLobbies[match.beatmapId] = [
            { matchId: match.id, startTime: match.startTime, lobbyId: gameLobby.lobby.id, beatmapId: match.beatmapId }
          ];
          continue;
        }
        if (sameMapsInManyLobbies[match.beatmapId].find(mlg => mlg.matchId === match.id)) {
          continue;
        }
        sameMapsInManyLobbies[match.beatmapId].push({
          matchId: match.id,
          startTime: match.startTime,
          lobbyId: gameLobby.lobby.id,
          beatmapId: match.beatmapId
        });
      }
    }

    return sameMapsInManyLobbies;
  }

  async buildGameReports(forGames: Game[]): Promise<GameReport[]> {
    try {
      if (!this.markAsProcessed) {
        throw new Error("Must process API results first before building report.");
      }
      // TODO: get report entities from DB
      // TODO: build report

      // Sequence of things to do:
      //    - Figure out what events we want to track -> add those events to the EventRegistrar
      //          - Register events in the EventRegistrar
      //
      //
      //    - Determine if ready to report results for a GameLobby map:
      for (const game of forGames) {
        const ready = this.allGameLobbiesFinishedMap(game.gameLobbies);
      }
      //
      //    - Build game events
      //          EventBuilder(game.matches) -> GameEvents[]
      //    - Build leaderboard
      //          LeaderboardBuilder(event[]) -> Leaderboard
      //    - Deliver leaderboard and game-message-targets to DiscordMessageBuilder
      //          DiscordMessageBuilder.sendLeaderboard(game, leaderboard)
      //
      //
      //
      // --------- IDEA -------------
      // - api has pushed some data for a lobby result (e.g. map finished)
      // - MpResultsProcessor processes that data with .process()
      //       - saves the data in the database
      //       - forwards the saved data to the GameReportBuilder
      // - GameReportBuilder
      //       - determines the latest events that happened in the game
      //       - builds the game report (with a leaderboard) from those
      // -----------------------------

      // Build a collection of game-events for the leaderboard for each game we received match-results for.
      const gameEventRegistrarCollection: GameEventRegistrarCollection = iocContainer.get<GameEventRegistrarCollection>(
        TYPES.GameEventRegistrarCollection
      );

      for (const game of forGames) {
        const registrar: GameEventRegistrar = gameEventRegistrarCollection.findOrCreate(game.id);
        const events: GameEvent[] = registrar.getEvents();
        const leaderboardEvents: GameEvent[] = [];
        for (const eventType in events) {
          const event: GameEvent = events[eventType];
          if (event.happenedIn(game)) {
            // event should have event.data defined if happenedIn === true
            leaderboardEvents.push(event);
          }
        }
      }

      return null;

      // build the "most recent" game report with leaderboard-data for the events determined by the entire history of the game's matches
      // const gameReportBuilder = new GameReportBuilder(leaderboardEvents);
      // const gameReport = gameReportBuilder.build();

      // after building, fire event "report created for game <gameId>"

      // throw new Error("TODO: Implement method of MultiplayerResultsProcessor.");
    } catch (error) {
      Log.methodError(this.buildGameReports, this.constructor.name, error);
      throw error;
    }
  }

  private allGameLobbiesFinishedMap(gameLobbies: GameLobby[]): boolean {
    const lobbyMatchIds: { lid: number; mids: number[] }[] = gameLobbies.map(gl => {
      return { lid: gl.lobby.id, mids: [] };
    });
    //       - get all game lobbies and their matches (ordered such that the most recently-completed matches are listed at a later index for that game lobby)
    //       - if all game lobbies have match results for a map
    gameLobbies.forEach(gl => {
      gl.lobby.matches.forEach(m => {
        lobbyMatchIds.find(lmid => lmid.lid === gl.lobby.id).mids.push(m.id);
      });
    });
    let smallestMatchCount = Number.POSITIVE_INFINITY;
    lobbyMatchIds.map(lmid => {
      if (lmid.mids.length < smallestMatchCount) smallestMatchCount = lmid.mids.length;
    });
    //          - trim all other GameLobby arrays to have the same size as the smallest array.
    let glsTrimmed = cloneDeep(gameLobbies);
    glsTrimmed = glsTrimmed.map(gl => {
      if (smallestMatchCount < gl.lobby.matches.length) {
        gl.lobby.matches.splice(smallestMatchCount, gl.lobby.matches.length - smallestMatchCount);
      }
      return gl;
    });

    // game.latestReportedMatch: { matchBeatmapId: number, sameLobbyMapIdsLatestEndTime: number }

    //          - if array1 is not empty, and if results have not been calculated for match at array1[n-1], that map is complete --> report results
    // if (glsTrimmed[0].lobby.matches.length && )
    //      - if not ready to report results
    //         - deliver message "Lobby L1 finished map A (id, mapString). Waiting on results from lobbies B,C,..."
    //
    return false;
  }
}
