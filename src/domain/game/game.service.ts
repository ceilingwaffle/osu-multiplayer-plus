import { inject } from "inversify";
import { Repository } from "typeorm";
import { Game } from "./game.entity";

export class GameService {
  constructor(@inject(Repository) private readonly gameRepository: Repository<Game>) {
    console.debug("Initialized Game Service.");
  }
}
