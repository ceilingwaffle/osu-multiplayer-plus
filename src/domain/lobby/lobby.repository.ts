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

    const lobby = await this.createQueryBuilder("lobby")
      .leftJoinAndSelect("lobby.gameLobbies", "gameLobbies") // 1
      .leftJoinAndSelect("gameLobbies.game", "game") // 2

      .leftJoinAndSelect("game.gameTeams", "gameTeams") // 3
      .leftJoinAndSelect("gameTeams.team", "team") // 4
      .leftJoinAndSelect("team.teamOsuUsers", "teamOsuUsers") // 5
      .leftJoinAndSelect("teamOsuUsers.osuUser", "osuUser") // 6

      .leftJoinAndSelect("game.gameLobbies", "gameLobbies_game") // 7
      .leftJoinAndSelect("gameLobbies_game.lobby", "gameLobbies_lobby") // 8
      .leftJoinAndSelect("gameLobbies_lobby.matches", "matches") // 9
      .leftJoinAndSelect("matches.lobby", "matches_lobby") // 10
      .leftJoinAndSelect("matches_lobby.matches", "matches_lobby_matches") // 11
      .leftJoinAndSelect("matches.playerScores", "playerScores") // 12
      .leftJoinAndSelect("playerScores.scoredBy", "scoredBy") // 13
      .leftJoinAndSelect("scoredBy.user", "user") // 14

      .leftJoinAndSelect("game.gameMatchesReported", "gameMatchesReported")
      .leftJoinAndSelect("matches.matchAbortion", "matchAbortion")
      .leftJoinAndSelect("matches.beatmap", "beatmap")
      .leftJoin("gameMatchesReported.match", "gameMatchesReported_match") // TODO: Does this still select matches if we have some reported match records in the database?

      .where("lobby.id = :lobbyId", { lobbyId: lobbyId })
      .getOne();

    return lobby;
  }
}
