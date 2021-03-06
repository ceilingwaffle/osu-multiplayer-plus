import iocContainer from "../../inversify.config";
import TYPES from "../../types";
import { ApiMultiplayer } from "../../osu/types/api-multiplayer";
import { Game } from "../../domain/game/game.entity";
import { IDbClient } from "../../database/db-client";
import { Connection } from "typeorm";
import { Lobby } from "../../domain/lobby/lobby.entity";
import { LobbyRepository } from "../../domain/lobby/lobby.repository";
import { OsuUser } from "../../domain/user/osu-user.entity";
import { Match } from "../../domain/match/match.entity";
import { Log } from "../../utils/log";
import { PlayerScore } from "../../domain/score/player-score.entity";
import { OsuUserRepository } from "../../domain/user/osu-user.repository";
import { GameStatus } from "../../domain/game/game-status";
import { LobbyService } from "../../domain/lobby/lobby.service";
import { UserService } from "../../domain/user/user.service";
import { IOsuApiFetcher } from "../../osu/interfaces/osu-api-fetcher";
import { MatchService } from "../../domain/match/match.service";

export class MultiplayerEntitySaver {
  /**
   * Takes multiplayer results from the osu API and creates and saves database entities from those results.
   *
   * @returns {Promise<Game[]>} - The games (active games) that have added the lobby owner of the ApiMultiplayer input data.
   * @memberof MultiplayerResultsProcessor
   */
  static async saveMultiplayerEntities(multiplayerData: ApiMultiplayer): Promise<Game[]> {
    try {
      const dbClient: IDbClient = iocContainer.get<IDbClient>(TYPES.IDbClient);
      const dbConn: Connection = dbClient.getConnection();
      const userService: UserService = iocContainer.get<UserService>(TYPES.UserService);
      const lobbyService: LobbyService = iocContainer.get<LobbyService>(TYPES.LobbyService);
      const osuApi: IOsuApiFetcher = iocContainer.get<IOsuApiFetcher>(TYPES.IOsuApiFetcher);

      // ensure required API data exists
      MultiplayerEntitySaver.validateMultiplayerApiResults(multiplayerData);

      // get existing entities from DB
      //    find lobby using input.multiplayerId
      let lobby: Lobby = await dbConn.manager.getCustomRepository(LobbyRepository).findOne(
        { banchoMultiplayerId: multiplayerData.multiplayerId },
        {
          relations: [
            "gameLobbies",
            "gameLobbies.game",
            "matches",
            "matches.playerScores",
            "matches.playerScores.scoredBy",
            "matches.playerScores.scoredBy.user",
            "matches.beatmap"
          ]
        }
      );
      //      create lobby if not found
      if (!lobby) {
        lobby = lobbyService.create({ banchoMultiplayerId: multiplayerData.multiplayerId });
      }

      const players: OsuUser[] = [];

      //    find matches using Lobby.Match[].startTime + Lobby.banchoMultiplayerId
      //    (this can only produce duplicate results if two matches in the same lobby start at the same time
      //         - safe to assume this is impossible, unless the osu API royally messes up)
      for (const apiMatch of multiplayerData.matches) {
        const matches: Match[] = lobby.matches.filter(
          lobbyMatch =>
            lobbyMatch.startTime == apiMatch.startTime &&
            lobby.banchoMultiplayerId == multiplayerData.multiplayerId &&
            lobbyMatch.beatmap.beatmapId == apiMatch.mapId
          // TODO - save Beatmap reference here
        );
        if (matches.length > 1) {
          Log.warn(
            "Duplicate matches found. This is bad. Probably because two maps had the same start-time in the same lobby. This should never happen! For now, we'll just select and use the last of these duplicates."
          );
        }
        let match: Match = matches.slice(-1)[0]; // undefined if no matches exist
        if (!match) {
          //      create match if not found
          match = MatchService.createMatchFromApiMatch(apiMatch, lobby);
          lobby.matches.push(match);
        } else {
          // ensure that the previously-saved match endTime is in sync with the API match endTime
          if (match.endTime != apiMatch.endTime) {
            const m = lobby.matches.find(m => m.id === match.id);
            if (!m) {
              // match = MatchService.createMatchFromApiMatch(apiMatch, lobby);
              // lobby.matches.push(match);
              throw new Error("Match ID does not exist. This should never happen :/");
            }
            m.endTime = isNaN(apiMatch.endTime) ? null : apiMatch.endTime;
          }
        }

        for (const apiScore of apiMatch.scores) {
          //    find scores using Lobby.Match[].startTime + Lobby.Match.PlayerScores[].scoredBy(OsuUser).osuUserId + Lobby.Match.PlayerScores[].score (including score and bmid here is just for increased safety, in case two matches have the same startTime for some weird reason)
          const scores: PlayerScore[] = match.playerScores.filter(
            score =>
              match.startTime == apiMatch.startTime &&
              score.scoredBy.osuUserId == apiScore.osuUserId &&
              score.score == apiScore.score &&
              match.beatmap.beatmapId == apiMatch.mapId
            // TODO - save Beatmap reference here
          );
          if (scores.length > 1) {
            Log.warn(
              "Duplicate player scores found. This should never happen. For now, we'll just select and use the last of these duplicates."
            );
          }
          let score = scores.slice(-1)[0]; // undefined if no scores exist
          if (!score) {
            //      create score if not found
            //      find player using Lobby.Match[].PlayerScores[].scoredBy(OsuUser).osuUserId
            let player: OsuUser;
            if (!player) {
              player = lobby.matches
                .map(match => match.playerScores)
                .map(scores => scores.find(score => score.scoredBy.osuUserId == apiScore.osuUserId))
                .map(score => {
                  if (score) return score.scoredBy;
                })[0];
            }
            if (!player) {
              //      find player in DB
              player = await dbConn.manager.getCustomRepository(OsuUserRepository).findOne({ osuUserId: apiScore.osuUserId });
            }
            if (!player) {
              //        get the player's osu username from the osu API
              const apiOsuUser = await osuApi.getUserDataForUserId(apiScore.osuUserId);
              //        create player if not found
              player = userService.createOsuUser({
                userId: apiOsuUser.userId,
                username: apiOsuUser.username, // TODO: Handle user's changing username - maybe a nightly cron job to update active users?
                countryCode: apiOsuUser.country
              });
              player.user = userService.createUser({});
            }
            if (player && !players.find(p => p.osuUserId == player.osuUserId)) {
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
            score.scoreLetterGrade = apiScore.scoreLetterGrade;
            score.accuracy = apiScore.accuracy;
            match.playerScores.push(score);
          }
        }
      }

      // save any new players created
      const savedOsuUsers: OsuUser[] = [];
      for (const p of players.filter(p => !p.createdAt)) {
        // TODO - Optimize N+1

        // check if user exists first before saving (TODO: improve hacky solution :/)
        const existingOsuUser = await OsuUser.findOne({ osuUserId: p.osuUserId });
        if (existingOsuUser) {
          savedOsuUsers.push(existingOsuUser);
        } else {
          const savedOsuUser: OsuUser = await p.save();
          savedOsuUsers.push(savedOsuUser);
        }
      }

      // update lobby with saved player entities
      savedOsuUsers.forEach(ou => {
        lobby.matches.forEach(m => {
          m.playerScores.forEach(ps => {
            if (ps.scoredBy && ps.scoredBy.osuUserId == ou.osuUserId) {
              ps.scoredBy = ou;
            }
          });
        });
      });

      // save/update (cascade) entities
      // TODO: ensure Lobby.GameLobbies isn't being erased - if it is, just add it to the relations when finding lobby
      const savedLobby = await lobby.save();
      const reloadedLobby: Lobby = await dbConn.manager.getCustomRepository(LobbyRepository).findMultiplayerEntitiesForLobby(savedLobby.id);

      const multiplayerGames: Game[] = reloadedLobby.gameLobbies.map(gl => gl.game).filter(g => GameStatus.isStartedStatus(g.status));
      multiplayerGames.forEach(game => {
        // filter out any gameTeams not having a team for some reason
        game.gameTeams = game.gameTeams.filter(gameTeam => gameTeam.team);
      });

      Log.methodSuccess(this.saveMultiplayerEntities, this.constructor.name);
      return multiplayerGames;
    } catch (error) {
      Log.methodError(this.saveMultiplayerEntities, this.constructor.name, error);
      throw error;
    }
  }

  private static validateMultiplayerApiResults(multiplayerData: ApiMultiplayer) {
    if (!multiplayerData.multiplayerId) {
      throw new Error("Multiplayer API result did not contain a multiplayer ID.");
    }
  }
}
