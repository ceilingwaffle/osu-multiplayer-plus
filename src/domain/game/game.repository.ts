import { Repository, EntityRepository } from "typeorm";
import { Game } from "./game.entity";

@EntityRepository(Game)
export class GameRepository extends Repository<Game> {}
