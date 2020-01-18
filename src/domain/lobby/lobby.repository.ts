import { Repository, EntityRepository } from "typeorm";
import { Lobby } from "./lobby.entity";

@EntityRepository(Lobby)
export class LobbyRepository extends Repository<Lobby> {
  async findMultiplayerEntitiesForLobby(lobbyId: number): Promise<Lobby> {
    // "gameLobbies", 1
    // "gameLobbies.game", 2

    // "gameLobbies.game.gameTeams", 3
    // "gameLobbies.game.gameTeams.team", 4
    // "gameLobbies.game.gameTeams.team.teamOsuUsers", 5
    // "gameLobbies.game.gameTeams.team.teamOsuUsers.osuUser", 6

    // "gameLobbies.game.gameLobbies", 7
    // "gameLobbies.game.gameLobbies.lobby", 8
    // "gameLobbies.game.gameLobbies.lobby.matches", 9
    // "gameLobbies.game.gameLobbies.lobby.matches.lobby", 10
    // "gameLobbies.game.gameLobbies.lobby.matches.lobby.matches", 11
    // "gameLobbies.game.gameLobbies.lobby.matches.playerScores", 12
    // "gameLobbies.game.gameLobbies.lobby.matches.playerScores.scoredBy", 13
    // "gameLobbies.game.gameLobbies.lobby.matches.playerScores.scoredBy.user" 14

    const lobby = await this.createQueryBuilder("lobby") //                           lobby
      .leftJoinAndSelect("lobby.gameLobbies", "gameLobbies") // 1                     lobby.gameLobbies
      .leftJoinAndSelect("gameLobbies.game", "game") // 2                             lobby.gameLobbies.game

      .leftJoinAndSelect("game.gameTeams", "gameTeams") // 3                          lobby.gameLobbies.game.gameTeams
      .leftJoinAndSelect("gameTeams.team", "team") // 4                               lobby.gameLobbies.game.gameTeams.team
      .leftJoinAndSelect("team.teamOsuUsers", "teamOsuUsers") // 5                    lobby.gameLobbies.game.gameTeams.team.teamOsuUsers
      .leftJoinAndSelect("teamOsuUsers.osuUser", "osuUser") // 6                      lobby.gameLobbies.game.gameTeams.team.teamOsuUsers.osuUser

      .leftJoinAndSelect("game.gameLobbies", "gameLobbies_game") // 7          ❌ lobby.gameLobbies.game.gameLobbies
      .leftJoinAndSelect("gameLobbies_game.lobby", "gameLobbies_lobby") // 8   ❌ lobby.gameLobbies.game.gameLobbies.lobby
      .leftJoinAndSelect("gameLobbies_lobby.matches", "matches") // 9          ❌ lobby.gameLobbies.game.gameLobbies.lobby.matches
      // .leftJoinAndSelect("lobby.matches", "matches") //                           ➕ lobby.matches

      // .leftJoinAndSelect("matches.lobby", "matches_lobby") // 10               ❌ lobby.matches.lobby
      // .leftJoinAndSelect("matches_lobby.matches", "matches_lobby_matches") //11❌ lobby.matches.lobby.matches
      .leftJoinAndSelect("matches.playerScores", "playerScores") // 12                lobby.matches.playerScores
      .leftJoinAndSelect("playerScores.scoredBy", "scoredBy") // 13                   lobby.matches.playerScores.scoredBy
      .leftJoinAndSelect("scoredBy.user", "user") // 14                               lobby.matches.playerScores.scoredBy.user

      .leftJoinAndSelect("game.deliveredReportables", "deliveredReportables") //        lobby.gameLobbies.game.deliveredReportables
      .leftJoinAndSelect("matches.matchAbortion", "matchAbortion") //                 lobby.matches.matchAbortion
      .leftJoinAndSelect("matches.beatmap", "beatmap") //                             lobby.matches.beatmap

      .where("lobby.id = :lobbyId", { lobbyId: lobbyId })
      .getOne();

    return lobby;
  }
}
