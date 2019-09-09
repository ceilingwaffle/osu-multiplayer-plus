import "reflect-metadata";
import { buildProviderModule } from "inversify-binding-decorators";
import { Container } from "inversify";
import { IOsuLobbyScanner } from "./osu/interfaces/osu-lobby-scanner";
import { OsuLobbyScannerService } from "./osu/osu-lobby-scanner-service";
import { TYPES } from "./types";
import { GameService } from "./domain/game/game.service";
import { GameController } from "./domain/game/game.controller";
import { UserService } from "./domain/user/user.service";
import { LobbyController } from "./domain/lobby/lobby.controller";
import { TeamController } from "./domain/team/team.controller";
import { UserController } from "./domain/user/user.controller";
import { RequesterFactory } from "./requests/requester-factory";

// const iocContainer = new Container();
// autoProvide(iocContainer, entities);
// iocContainer.load(buildProviderModule());
// export default iocContainer;

export class IOCKernel extends Container {
  constructor() {
    super();
    this.init();
  }

  private init() {
    this.declareDependencies();
    this.load(buildProviderModule());
  }

  private declareDependencies() {
    this.bind<GameController>(TYPES.GameController)
      .to(GameController)
      .inSingletonScope();
    this.bind<GameService>(TYPES.GameService)
      .to(GameService)
      .inSingletonScope();
    this.bind<UserController>(TYPES.UserController)
      .to(UserController)
      .inSingletonScope();
    this.bind<UserService>(TYPES.UserService)
      .to(UserService)
      .inSingletonScope();
    this.bind<LobbyController>(TYPES.LobbyController)
      .to(LobbyController)
      .inSingletonScope();
    this.bind<TeamController>(TYPES.TeamController)
      .to(TeamController)
      .inSingletonScope();
    this.bind<IOsuLobbyScanner>(TYPES.IOsuLobbyScanner)
      .to(OsuLobbyScannerService)
      .inSingletonScope();
    this.bind<RequesterFactory>(TYPES.RequesterFactory)
      .to(RequesterFactory)
      .inSingletonScope();
  }
}

const iocContainer = new IOCKernel();
export default iocContainer;
