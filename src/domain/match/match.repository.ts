import { Repository, EntityRepository } from "typeorm";
import { Match } from "./match.entity";

@EntityRepository(Match)
export class MatchRepository extends Repository<Match> {
  async getMatchesOfGame(gameId: number): Promise<Match[]> {
    const matches = await this.createQueryBuilder("match")
      .leftJoinAndSelect("match.beatmap", "beatmap")

      .leftJoinAndSelect("match.lobby", "lobby")
      .leftJoinAndSelect("lobby.gameLobbies", "gameLobbies")

      .leftJoinAndSelect("match.playerScores", "playerScores")
      .leftJoinAndSelect("playerScores.scoredBy", "scoredBy")
      .leftJoinAndSelect("scoredBy.user", "user")

      .leftJoinAndSelect("match.matchAbortion", "matchAbortion")

      .leftJoinAndSelect("gameLobbies.game", "game")
      .leftJoinAndSelect("game.deliveredReportables", "deliveredReportables")

      .where("game.id = :gameId", { gameId: gameId })
      .getMany();

    return matches;
  }
}
