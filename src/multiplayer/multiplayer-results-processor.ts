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
import { LobbyBeatmapStatusMessage } from "./lobby-beatmap-status-message";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { PlayMode } from "./components/enums/play-mode";
import { ScoringType } from "./components/enums/scoring-type";
import { TeamMode } from "./components/enums/team-mode";
import { BeatmapLobbyPlayedStatusGroup } from "./beatmap-lobby-played-status-group";
import { Match as MatchComponent } from "./components/match";
import { Lobby as LobbyComponent } from "./components/lobby";

export class MultiplayerResultsProcessor {
  // @lazyInject(TYPES.UserService) private userService: UserService;
  // @lazyInject(TYPES.TeamService) private teamService: TeamService;
  // @lazyInject(TYPES.LobbyService) private lobbyService: LobbyService;
  // TODO: Don't get these from the ioc container - should be able to inject somehow
  private userService: UserService = iocContainer.get<UserService>(TYPES.UserService);
  private lobbyService: LobbyService = iocContainer.get<LobbyService>(TYPES.LobbyService);
  private osuApi: IOsuApiFetcher = iocContainer.get<IOsuApiFetcher>(TYPES.IOsuApiFetcher);
  private gameEventRegistrarCollection: GameEventRegistrarCollection = iocContainer.get<GameEventRegistrarCollection>(TYPES.GameEventRegistrarCollection); //prettier-ignore
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
        const matches: Match[] = lobby.matches.filter(
          lobbyMatch =>
            lobbyMatch.startTime === apiMatch.startTime &&
            lobby.banchoMultiplayerId === this.input.multiplayerId &&
            lobbyMatch.beatmapId === apiMatch.mapId
        );
        if (matches.length > 1) {
          Log.warn(
            "Duplicate match results found! This is bad. Probably because two maps had the same start-time in the same lobby. This should never happen! For now, we'll just select and use the last of these duplicates."
          );
        }
        let match: Match = matches.slice(-1)[0]; // set to undefined if no matches exist
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
      const reloadedLobby: Lobby = await this.dbConn.manager
        .getCustomRepository(LobbyRepository)
        .findMultiplayerEntitiesForLobby(savedLobby.id);

      const multiplayerGames: Game[] = reloadedLobby.gameLobbies.map(gl => gl.game).filter(g => GameStatus.isStartedStatus(g.status));
      Log.methodSuccess(this.saveMultiplayerEntities, this.constructor.name);
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

  /**
   * Returns a list of beatmaps each containing lists of lobbies where the ebatmap is "played in lobbies" and "remaining to be played in lobbies".
   * The lobbies are all lobbies currently being watched for a game (active lobby, being sacnend by the osu lobby scanner, and added to the game).
   *
   * @param {Game} game
   * @returns {BeatmapLobbyPlayedStatusGroup[]}
   */
  buildBeatmapsGroupedByLobbyPlayedStatusesForGame(game: Game): BeatmapLobbyPlayedStatusGroup[] {
    const matches: Match[] = _(game.gameLobbies)
      .map(gameLobby => gameLobby.lobby)
      .map(lobby => lobby.matches)
      .flattenDeep()
      .uniqBy(match => match.id)
      .cloneDeep();

    const lobbies: Lobby[] = _(game.gameLobbies)
      .map(gameLobby => gameLobby.lobby)
      .uniqBy(lobby => lobby.id)
      .cloneDeep();

    return this.buildBeatmapsGroupedByLobbyPlayedStatuses(matches, lobbies);
  }

  private buildBeatmapsGroupedByLobbyPlayedStatuses(matches: Match[], lobbies: Lobby[]): BeatmapLobbyPlayedStatusGroup[] {
    try {
      if (!matches || !matches.length) {
        Log.methodFailure(
          this.buildBeatmapsGroupedByLobbyPlayedStatuses,
          this.constructor.name,
          "Matches array arg was undefined or empty."
        );
        return new Array<BeatmapLobbyPlayedStatusGroup>();
      }
      if (!lobbies || !lobbies.length) {
        Log.methodFailure(
          this.buildBeatmapsGroupedByLobbyPlayedStatuses,
          this.constructor.name,
          "Lobbies array arg was undefined or empty."
        );
        return new Array<BeatmapLobbyPlayedStatusGroup>();
      }

      const r = _(matches)
        .sortBy(match => match.endTime) // TODO: sort everywhere by startTime instead of endTime
        .groupBy(match =>
          JSON.stringify({
            beatmapId: match.beatmapId,
            sameBeatmapNumber:
              matches.filter(m => m.lobby.id === match.lobby.id && m.beatmapId === match.beatmapId).findIndex(m => m.id === match.id) + 1
          })
        )
        .map((matches, matchesKey) => {
          const keyAsObject = JSON.parse(matchesKey) as { beatmapId: string; sameBeatmapNumber: number };
          return {
            beatmapId: keyAsObject.beatmapId,
            sameBeatmapNumber: keyAsObject.sameBeatmapNumber,
            matches: matches,
            lobbies: lobbies
          };
        })
        .map<BeatmapLobbyPlayedStatusGroup>(o => {
          // beatmapPlayedTimes = the most number of times the same beatmap has been played in the same lobby
          // const beatmapPlayedTimes = Math.max(0, ...o.matches.map(m => m.lobby.matches.filter(lm => lm.beatmapId === m.beatmapId).length));
          const beatmapPlayedTimes = Math.max(
            0,
            ...o.matches.map(m => o.lobbies.find(ol => ol.id === m.lobby.id).matches.filter(lm => lm.beatmapId === m.beatmapId).length)
          );
          if (beatmapPlayedTimes < 1) {
            throw new Error(
              `Value for 'sameBeatmapNumber' was ${beatmapPlayedTimes}. This means the beatmap was probably not found ` +
                `in any matches or lobbies. This should never happen :/`
            );
          }
          const matchLastPlayedThisMap = _(o.matches)
            .map(m => m.lobby.matches.filter(lm => lm.beatmapId === m.beatmapId))
            .flatten()
            .value()[beatmapPlayedTimes - 1];
          return {
            beatmapId: o.beatmapId,
            sameBeatmapNumber: o.sameBeatmapNumber,
            matches: o.matches,
            lobbies: {
              greatestPlayedCount: beatmapPlayedTimes,
              // "played" and "remaining" depends on how many times a lobby has played the same map.
              // e.g. If lobby 1 plays BM1, then lobby 2 plays BM1, then lobby 1 plays BM1 again, lobby 2 goes in "remaining"
              //       because we're still waiting on lobby 2 to complete BM1 for the 2nd time (lb === 2)
              played: o.lobbies.filter(
                l => l.matches.filter(lm => lm.beatmapId === matchLastPlayedThisMap.beatmapId).length === beatmapPlayedTimes
              ),
              remaining: o.lobbies.filter(
                l => l.matches.filter(lm => lm.beatmapId === matchLastPlayedThisMap.beatmapId).length !== beatmapPlayedTimes
              )
            }
          };
        })
        .value();

      return r;
    } catch (error) {
      Log.methodError(this.buildBeatmapsGroupedByLobbyPlayedStatuses, this.constructor.name, error);
      throw error;
    }
  }

  buildLobbyMatchReportMessages({
    beatmapsPlayed,
    reportedMatches,
    allGameLobbies
  }: {
    beatmapsPlayed: BeatmapLobbyPlayedStatusGroup[];
    reportedMatches: Match[];
    allGameLobbies: Lobby[];
  }): LobbyBeatmapStatusMessage[] {
    // creating clones of both the matches and the lobbies just for safety - in case they get modified anywhere
    const allMatches: Match[] = _(beatmapsPlayed)
      .map(bmp => bmp.matches)
      .flatten()
      .uniqBy(match => match.id)
      .sortBy(match => match.endTime)
      .cloneDeep();

    const allLobbies = _(allGameLobbies)
      .uniqBy(l => l.id)
      .cloneDeep();

    const completedMessagesAllAtOnce: LobbyBeatmapStatusMessage[] = this.gatherCompletedMessages({ allMatches, beatmapsPlayed });
    const completedMessages: LobbyBeatmapStatusMessage[] = [];
    const waitingMessages: LobbyBeatmapStatusMessage[] = [];
    for (let i = 0; i < allMatches.length; i++) {
      // we filter out any matches not yet "seen by" each lobby, so we can generate groups of beatmaps up to this point in time
      const matchesUpToNow = allMatches.slice(0, i + 1);
      const allLobbiesCopy: Lobby[] = _(allLobbies).cloneDeep();
      allLobbiesCopy.forEach(l => (l.matches = l.matches.filter(lm => matchesUpToNow.some(m => m.id === lm.id))));
      const beatmapsGroupedByLobbyPlayedStatus = this.buildBeatmapsGroupedByLobbyPlayedStatuses(matchesUpToNow, allLobbiesCopy);

      const thisMatch = allMatches[i];
      const beatmapNumber: number = this.getSameBeatmapNumberPlayedInLobbyForMatch(beatmapsGroupedByLobbyPlayedStatus, thisMatch);
      const completedMapTarget: BeatmapLobbyPlayedStatusGroup = beatmapsGroupedByLobbyPlayedStatus.find(
        b => b.beatmapId === thisMatch.beatmapId && b.sameBeatmapNumber === beatmapNumber
      );
      completedMapTarget.lobbies.played.forEach(pLobby => {
        const message: LobbyBeatmapStatusMessage = {
          message: `Lobby ${pLobby.id} completed beatmap ${thisMatch.beatmapId}#${beatmapNumber}.`,
          lobby: this.buildLobbyComponent(pLobby),
          match: this.buildMatchComponent(thisMatch),
          beatmapNumber: beatmapNumber
        };
        if (!completedMessages.find(msg => msg.message == message.message)) completedMessages.push(message);
      });

      // TODO: Build the waiting messages from the beatmap groups
      const waitingMapTarget = beatmapsGroupedByLobbyPlayedStatus.find(b => b.beatmapId === thisMatch.beatmapId);
      waitingMapTarget.lobbies.remaining.forEach(rLobby => {
        const message: LobbyBeatmapStatusMessage = {
          message: `Waiting on beatmap ${thisMatch.beatmapId}#${beatmapNumber} from lobby ${rLobby.id}.`,
          lobby: this.buildLobbyComponent(rLobby),
          match: this.buildMatchComponent(thisMatch),
          beatmapNumber: beatmapNumber
        };
        waitingMessages.push(message);
      });

      // TODO: Filter out reportedMatches
      const a = true;
    }

    Log.warn("TODO - implement method", this.buildLobbyMatchReportMessages.name, this.constructor.name);
    //throw new Error("TODO: Implement method of MultiplayerResultsProcessor.");
    return null;
  }

  private buildLobbyComponent(fromLobby: Lobby): LobbyComponent {
    return { banchoLobbyId: fromLobby.banchoMultiplayerId, lobbyName: "TODO:rLobbyName", resultsUrl: "TODO:rLobbyResultsURL" };
  }

  private buildMatchComponent(fromMatchEntity: Match): MatchComponent {
    return {
      startTime: fromMatchEntity.startTime,
      endTime: fromMatchEntity.endTime,
      playMode: PlayMode.Standard,
      scoringType: ScoringType.scoreV2,
      teamType: TeamMode.HeadToHead,
      forcedMods: 0,
      beatmap: { mapId: fromMatchEntity.beatmapId, mapUrl: "TODO:MapURL", mapString: "TODO:MapString" },
      status: "completed",
      entityId: fromMatchEntity.id
    }; // TODO: get PlayMode, ScoringType, TeamMode, Mods, status
  }

  private gatherCompletedMessages({
    allMatches,
    beatmapsPlayed
  }: {
    allMatches: Match[];
    beatmapsPlayed: BeatmapLobbyPlayedStatusGroup[];
  }): LobbyBeatmapStatusMessage[] {
    const completedMessages: LobbyBeatmapStatusMessage[] = [];
    for (const match of allMatches) {
      const beatmapNumber: number = this.getSameBeatmapNumberPlayedInLobbyForMatch(beatmapsPlayed, match);
      const message: LobbyBeatmapStatusMessage = {
        lobby: { banchoLobbyId: match.lobby.banchoMultiplayerId, lobbyName: "TODO:LobbyName", resultsUrl: "TODO:ResultsURL" },
        match: this.buildMatchComponent(match),
        beatmapNumber: beatmapNumber,
        message: `Lobby ${match.lobby.id} completed beatmap ${match.beatmapId}#${beatmapNumber}.`
      };
      completedMessages.push(message);
    }
    return _(completedMessages)
      .sortBy(cm => cm.match.endTime)
      .value();
  }

  private getSameBeatmapNumberPlayedInLobbyForMatch(beatmapsPlayed: BeatmapLobbyPlayedStatusGroup[], match: Match): number {
    try {
      // This relies on the matches listed under each "beatmapPlayed" to be only listed there if the match was played for a specific "same beatmap number".
      // i.e. The matches listed under "beatmapPlayed" should not contain every match played with that beatmap ID, instead it should only
      //      list matches included for that beatmap ID *and* what number of times that specific beatmap ID has been played.
      for (const bmp of beatmapsPlayed) {
        if (bmp.matches.some(m => m.id === match.id)) {
          return bmp.sameBeatmapNumber;
        }
      }
      throw new Error("Target match not found.");
    } catch (error) {
      Log.methodError(this.getSameBeatmapNumberPlayedInLobbyForMatch, this.constructor.name, error);
      throw error;
    }
  }

  buildLeaderboardEvents(game: Game): GameEvent[] {
    const registrar: GameEventRegistrar = this.gameEventRegistrarCollection.findOrCreate(game.id);
    const events: GameEvent[] = registrar.getEvents();
    const leaderboardEvents: GameEvent[] = [];
    for (const eventType in events) {
      const event: GameEvent = events[eventType];
      if (event.happenedIn(game)) {
        // event should have event.data defined if happenedIn === true
        leaderboardEvents.push(event);
      }
    }
    return leaderboardEvents;
  }

  buildGameReport(leaderboardEvents: GameEvent[]): GameReport {
    Log.warn("TODO: Implement method of MultiplayerResultsProcessor.");
    return null;
  }

  // async buildGameReports(forGames: Game[]): Promise<GameReport[]> {
  //   try {
  //     if (!this.markAsProcessed) {
  //       throw new Error("Must process API results first before building report.");
  //     }
  //     // TODO: get report entities from DB
  //     // TODO: build report

  //     // Sequence of things to do:
  //     //    - Figure out what events we want to track -> add those events to the EventRegistrar
  //     //          - Register events in the EventRegistrar
  //     //
  //     //
  //     //    - Determine if ready to report results for a GameLobby map:
  //     for (const game of forGames) {
  //       const ready = this.allGameLobbiesFinishedMap(game.gameLobbies);
  //     }
  //     //
  //     //    - Build game events
  //     //          EventBuilder(game.matches) -> GameEvents[]
  //     //    - Build messages
  //     //          e.g. Lobby 1 completed BM1#1.
  //     //          e.g. Waiting on BM1#1 from lobbies 2."
  //     //          e.g. All lobbies have completed BM2#1
  //     //    - Build leaderboard
  //     //          LeaderboardBuilder(event[]) -> Leaderboard
  //     //    - Deliver leaderboard and game-message-targets to DiscordMessageBuilder
  //     //          DiscordMessageBuilder.sendLeaderboard(game, leaderboard)
  //     //
  //     //
  //     //
  //     // --------- IDEA -------------
  //     // - api has pushed some data for a lobby result (e.g. map finished)
  //     // - MpResultsProcessor processes that data with .process()
  //     //       - saves the data in the database
  //     //       - forwards the saved data to the GameReportBuilder
  //     // - GameReportBuilder
  //     //       - determines the latest events that happened in the game
  //     //       - builds the game report (with a leaderboard) from those
  //     // -----------------------------

  //     // Build a collection of game-events for the leaderboard for each game we received match-results for.
  //     const gameEventRegistrarCollection: GameEventRegistrarCollection = iocContainer.get<GameEventRegistrarCollection>(
  //       TYPES.GameEventRegistrarCollection
  //     );

  //     for (const game of forGames) {
  //       const registrar: GameEventRegistrar = gameEventRegistrarCollection.findOrCreate(game.id);
  //       const events: GameEvent[] = registrar.getEvents();
  //       const leaderboardEvents: GameEvent[] = [];
  //       for (const eventType in events) {
  //         const event: GameEvent = events[eventType];
  //         if (event.happenedIn(game)) {
  //           // event should have event.data defined if happenedIn === true
  //           leaderboardEvents.push(event);
  //         }
  //       }
  //     }

  //     return null;

  //     // build the "most recent" game report with leaderboard-data for the events determined by the entire history of the game's matches
  //     // const gameReportBuilder = new GameReportBuilder(leaderboardEvents);
  //     // const gameReport = gameReportBuilder.build();

  //     // after building, fire event "report created for game <gameId>"

  //     // throw new Error("TODO: Implement method of MultiplayerResultsProcessor.");
  //   } catch (error) {
  //     Log.methodError(this.buildGameReports, this.constructor.name, error);
  //     throw error;
  //   }
  // }

  // private allGameLobbiesFinishedMap(gameLobbies: GameLobby[]): boolean {
  //   const lobbyMatchIds: { lid: number; mids: number[] }[] = gameLobbies.map(gl => {
  //     return { lid: gl.lobby.id, mids: [] };
  //   });
  //   //       - get all game lobbies and their matches (ordered such that the most recently-completed matches are listed at a later index for that game lobby)
  //   //       - if all game lobbies have match results for a map
  //   gameLobbies.forEach(gl => {
  //     gl.lobby.matches.forEach(m => {
  //       lobbyMatchIds.find(lmid => lmid.lid === gl.lobby.id).mids.push(m.id);
  //     });
  //   });
  //   let smallestMatchCount = Number.POSITIVE_INFINITY;
  //   lobbyMatchIds.map(lmid => {
  //     if (lmid.mids.length < smallestMatchCount) smallestMatchCount = lmid.mids.length;
  //   });
  //   //          - trim all other GameLobby arrays to have the same size as the smallest array.
  //   let glsTrimmed = cloneDeep(gameLobbies);
  //   glsTrimmed = glsTrimmed.map(gl => {
  //     if (smallestMatchCount < gl.lobby.matches.length) {
  //       gl.lobby.matches.splice(smallestMatchCount, gl.lobby.matches.length - smallestMatchCount);
  //     }
  //     return gl;
  //   });

  //   // game.latestReportedMatch: { matchBeatmapId: number, sameLobbyMapIdsLatestEndTime: number }

  //   //          - if array1 is not empty, and if results have not been calculated for match at array1[n-1], that map is complete --> report results
  //   // if (glsTrimmed[0].lobby.matches.length && )
  //   //      - if not ready to report results
  //   //         - deliver message "Lobby L1 finished map A (id, mapString). Waiting on results from lobbies B,C,..."
  //   //
  //   return false;
  // }
}
