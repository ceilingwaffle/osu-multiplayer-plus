import "reflect-metadata";
import { GameService } from "./domain/game/game.service";
import { GameController } from "./domain/game/game.controller";
import { UserService } from "./domain/user/user.service";
import { LobbyController } from "./domain/lobby/lobby.controller";
import { TeamController } from "./domain/team/team.controller";
import { UserController } from "./domain/user/user.controller";
import { RequesterFactory } from "./requests/requester-factory";
import { Permissions } from "./permissions/permissions";
import { Container } from "inversify";
import { TYPES } from "./types";
import { LobbyService } from "./domain/lobby/lobby.service";
import { TeamService } from "./domain/team/team.service";
import { NodesuApiFetcher } from "./osu/nodesu-api-fetcher";
import { IOsuApiFetcher } from "./osu/interfaces/osu-api-fetcher";
import { FakeOsuApiFetcher } from "../test/classes/fake-osu-api-fetcher";
import { IsValidBanchoMultiplayerIdConstraint } from "./osu/validators/bancho-multiplayer-id.validator";
import { IOsuLobbyScanner } from "./osu/interfaces/osu-lobby-scanner";
import { OsuLobbyScannerService } from "./osu/osu-lobby-scanner-service";
import { GameEventRegistrarCollection } from "./multiplayer/game-events/game-event-registrar-collection";
import { Connection } from "typeorm";
import { IDbClient, DbClient } from "./database/db-client";
import { MultiplayerResultsListener } from "./multiplayer/multiplayer-results-listener";
import { IEventDispatcher, EventDispatcher } from "./utils/event-dispatcher";

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
    // this.load(buildProviderModule());
  }

  // prettier-ignore
  private declareDependencies() {
    // game
    this.bind<GameController>(TYPES.GameController).to(GameController).inSingletonScope();
    this.bind<GameService>(TYPES.GameService).to(GameService).inSingletonScope();
    // user
    this.bind<UserController>(TYPES.UserController).to(UserController).inSingletonScope();
    this.bind<UserService>(TYPES.UserService).to(UserService).inSingletonScope();
    // lobby
    this.bind<LobbyController>(TYPES.LobbyController).to(LobbyController).inSingletonScope();
    this.bind<LobbyService>(TYPES.LobbyService).to(LobbyService).inSingletonScope();
    // team
    this.bind<TeamService>(TYPES.TeamService).to(TeamService).inSingletonScope();
    this.bind<TeamController>(TYPES.TeamController).to(TeamController).inSingletonScope();
    // ...
    this.bind<RequesterFactory>(TYPES.RequesterFactory).to(RequesterFactory).inSingletonScope();
    this.bind<Permissions>(TYPES.Permissions).to(Permissions).inSingletonScope();
    // this.bind<IsValidBanchoMultiplayerIdConstraint>(TYPES.IsValidBanchoMultiplayerIdConstraint).to(IsValidBanchoMultiplayerIdConstraint);
    this.bind<GameEventRegistrarCollection>(TYPES.GameEventRegistrarCollection).to(GameEventRegistrarCollection).inSingletonScope();
    this.bind<IDbClient>(TYPES.IDbClient).to(DbClient).inSingletonScope();

    this.bind<IOsuLobbyScanner>(TYPES.IOsuLobbyScanner).to(OsuLobbyScannerService).inSingletonScope();
    this.bind<MultiplayerResultsListener>(TYPES.MultiplayerResultsListener).to(MultiplayerResultsListener).inSingletonScope();

    this.bind<IEventDispatcher>(TYPES.IEventDispatcher).to(EventDispatcher).inSingletonScope();

    if (process.env.NODE_ENV === "test") {
      this.bind<IOsuApiFetcher>(TYPES.IOsuApiFetcher).to(FakeOsuApiFetcher).inSingletonScope();
      // this.bind<IOsuLobbyScanner>(TYPES.IOsuLobbyScanner).to(FakeOsuLobbyScanner).inSingletonScope();
    } else {
      this.bind<IOsuApiFetcher>(TYPES.IOsuApiFetcher).to(NodesuApiFetcher).inSingletonScope();
      // this.bind<IOsuLobbyScanner>(TYPES.IOsuLobbyScanner).to(OsuLobbyScannerService).inSingletonScope();
    }
  }
}

const iocContainer = new IOCKernel();
export default iocContainer;
