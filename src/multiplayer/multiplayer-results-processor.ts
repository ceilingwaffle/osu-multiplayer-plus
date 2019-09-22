import iocContainer from "../inversify.config";
import getDecorators from "inversify-inject-decorators";
import { TYPES } from "../types";
const { lazyInject } = getDecorators(iocContainer);
import { ApiMultiplayer } from "../osu/types/api-multiplayer";
import { GameReport } from "./reports/game.report";
import { UserService } from "../domain/user/user.service";
import { Log } from "../utils/Log";
import { LobbyRepository } from "../domain/lobby/lobby.repository";
import { getCustomRepository } from "typeorm";
import { LobbyService } from "../domain/lobby/lobby.service";
import { Lobby } from "../domain/lobby/lobby.entity";
import { Match } from "../domain/match/match.entity";
import { PlayerScore } from "../domain/score/player-score.entity";
import { OsuUser } from "../domain/user/osu-user.entity";
import { OsuUserRepository } from "../domain/user/osu-user.repository";
import { IOsuApiFetcher } from "../osu/interfaces/osu-api-fetcher";

export class MultiplayerResultsProcessor {
  // @lazyInject(TYPES.UserService) private userService: UserService;
  // @lazyInject(TYPES.TeamService) private teamService: TeamService;
  // @lazyInject(TYPES.LobbyService) private lobbyService: LobbyService;
  // TODO: Don't get these from the ioc container - should be able to inject somehow
  private userService: UserService = iocContainer.get<UserService>(TYPES.UserService);
  private lobbyService: LobbyService = iocContainer.get<LobbyService>(TYPES.LobbyService);
  private osuApi: IOsuApiFetcher = iocContainer.get<IOsuApiFetcher>(TYPES.IOsuApiFetcher);
  protected readonly lobbyRepository: LobbyRepository = getCustomRepository(LobbyRepository);
  protected readonly osuUserRepository: OsuUserRepository = getCustomRepository(OsuUserRepository);

  protected isProcessed: boolean;

  constructor(protected readonly input: ApiMultiplayer) {
    Log.info(`Initialized ${this.constructor.name}.`);
  }

  /**
   * Creates and saves database entities from the input API multiplayer results.
   *
   * @returns {Promise<GameReport[]>}
   */
  async process(): Promise<Lobby> {
    try {
      // ensure required API data exists
      this.validateApiResultsInput();

      // get existing entities from DB
      //    find lobby using input.multiplayerId
      let lobby: Lobby = await this.lobbyRepository.findOne(
        { banchoMultiplayerId: this.input.multiplayerId },
        {
          relations: [
            "gameLobbies",
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
      //    find matches using Lobby.Match[].startTime + Lobby.banchoMultiplayerId (this can only produce duplicate results if two matches in the same lobby start at the same time - safe to assume this is impossible, unless the osu API royally messes up)
      for (const apiMatch of this.input.matches) {
        let match: Match = lobby.matches.find(
          lobbyMatch => lobbyMatch.startTime === apiMatch.startTime.getTime() && lobby.banchoMultiplayerId === this.input.multiplayerId
        );
        if (!match) {
          //      create match if not found
          // TODO: Extract match creation to MatchService
          match = new Match();
          match.aborted = false; // TODO
          match.beatmapId = apiMatch.mapId.toString();
          match.endTime = apiMatch.endTime.getTime();
          match.ignored = false; // TODO
          match.lobby = lobby;
          match.mapNumber = apiMatch.mapNumber;
          match.playerScores = [];
          match.startTime = apiMatch.startTime.getTime();
          match.teamMode = apiMatch.teamMode;
          lobby.matches.push(match);
        }

        for (const apiScore of apiMatch.scores) {
          //    find scores using Lobby.Match[].startTime + Lobby.Match.PlayerScores[].scoredBy(OsuUser).osuUserId + Lobby.Match.PlayerScores[].score (including score here is just for increased safety, in case two matches have the same startTime for some weird reason)
          let score: PlayerScore = match.playerScores.find(
            score =>
              match.startTime === apiMatch.startTime.getTime() &&
              score.scoredBy.osuUserId === apiScore.osuUserId &&
              score.score === apiScore.score
          );
          //      create score if not found
          if (!score) {
            //      find player using Lobby.Match[].PlayerScores[].scoredBy(OsuUser).osuUserId
            let player: OsuUser = lobby.matches
              .map(match => match.playerScores)
              .map(scores => scores.find(score => score.scoredBy.osuUserId === apiScore.osuUserId))
              .map(score => {
                if (score) return score.scoredBy;
              })[0];
            if (!player) {
              //      find player in DB
              player = await this.osuUserRepository.findOne({ osuUserId: apiScore.osuUserId });
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
      const reloadedLobby: Lobby = await this.lobbyRepository.findOne(
        { banchoMultiplayerId: this.input.multiplayerId },
        {
          relations: [
            "gameLobbies",
            "gameLobbies.lobby",
            "gameLobbies.lobby.matches",
            "gameLobbies.lobby.matches.playerScores",
            "gameLobbies.lobby.matches.playerScores.scoredBy",
            "gameLobbies.lobby.matches.playerScores.scoredBy.user",
            "matches",
            "matches.playerScores",
            "matches.playerScores.scoredBy",
            "matches.playerScores.scoredBy.user"
          ]
        }
      );
      this.markAsProcessed();
      Log.methodSuccess(this.process, this.constructor.name);
      return reloadedLobby;
    } catch (error) {
      Log.methodError(this.process, this.constructor.name, error);
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

  async buildReport(): Promise<GameReport[]> {
    try {
      if (!this.markAsProcessed) {
        throw new Error("Must process API results first before building report.");
      }
      // TODO: get report entities from DB
      // TODO: build report

      // Sequence of things to do:
      //    - Determine if ready to report results for a GameLobby map:
      //       - get all game lobbies and their matches (ordered such that the most recently-completed matches are listed at a later index for that game lobby)
      //       - if all game lobbies have match results for a map
      //          - trim all other GameLobby arrays to have the same size as the smallest array.
      //          - if array1 is not empty, and if results have not been calculated for match at array1[n-1], that map is complete --> report results
      //      - if not ready to report results
      //         - deliver message "Lobby L1 finished map A (id, mapString). Waiting on results from lobbies B,C,..."
      //
      //    - Build game events
      //
      //
      //
      //
      //
      //
      //
      //

      // after building, fire event "report created for game <gameId>"
      throw new Error("TODO: Implement method of MultiplayerResultsProcessor.");
    } catch (error) {
      Log.methodError(this.buildReport, this.constructor.name, error);
      throw error;
    }
  }
}
