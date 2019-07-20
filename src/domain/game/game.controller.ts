import { inject } from "inversify";
import { GameService } from "./game.service";
import { CreateGameDto } from "./dto/index";

export class GameController {
  constructor(@inject(GameService) private readonly gameService: GameService) {
    console.debug("Initialized Game Controller.");
  }
}
