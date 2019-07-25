import { Repository, EntityRepository } from "typeorm";
import { Game } from "./game.entity";

@EntityRepository(Game)
export class GameRepository extends Repository<Game> {
  async findMostRecentGameCreatedByUser(userId: number): Promise<Game> {
    throw new Error("Method not yet implemented.");
    const qb = this.createQueryBuilder();
    return this.findOne({});
  }
}
