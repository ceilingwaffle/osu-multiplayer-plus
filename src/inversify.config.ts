import "reflect-metadata";
import { IOsuLobbyScanner } from "./osu/interfaces/osu-lobby-scanner";
import { OsuLobbyScannerService } from "./osu/osu-lobby-scanner-service";
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
import { FakeOsuLobbyScanner } from "../test/classes/fake-osu-lobby-scanner";
import { GameEventRegistrarCollection } from "./multiplayer/game-events/game-event-registrar-collection";
import { Connection } from "typeorm";
import { IDbClient, DbClient } from "./database/db-client";

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

  private declareDependencies() {
    // game
    this.bind<GameController>(TYPES.GameController).to(GameController).inSingletonScope(); // prettier-ignore
    this.bind<GameService>(TYPES.GameService).to(GameService).inSingletonScope(); // prettier-ignore
    // user
    this.bind<UserController>(TYPES.UserController).to(UserController).inSingletonScope(); // prettier-ignore
    this.bind<UserService>(TYPES.UserService).to(UserService).inSingletonScope(); // prettier-ignore
    // lobby
    this.bind<LobbyController>(TYPES.LobbyController).to(LobbyController).inSingletonScope(); // prettier-ignore
    this.bind<LobbyService>(TYPES.LobbyService).to(LobbyService).inSingletonScope(); // prettier-ignore
    // team
    this.bind<TeamService>(TYPES.TeamService).to(TeamService).inSingletonScope(); // prettier-ignore
    this.bind<TeamController>(TYPES.TeamController).to(TeamController).inSingletonScope(); // prettier-ignore
    // ...
    this.bind<RequesterFactory>(TYPES.RequesterFactory).to(RequesterFactory).inSingletonScope(); // prettier-ignore
    this.bind<Permissions>(TYPES.Permissions).to(Permissions).inSingletonScope(); // prettier-ignore
    // this.bind<IsValidBanchoMultiplayerIdConstraint>(TYPES.IsValidBanchoMultiplayerIdConstraint).to(IsValidBanchoMultiplayerIdConstraint); // prettier-ignore
    this.bind<GameEventRegistrarCollection>(TYPES.GameEventRegistrarCollection).to(GameEventRegistrarCollection).inSingletonScope(); // prettier-ignore
    this.bind<IDbClient>(TYPES.IDbClient).to(DbClient).inSingletonScope(); // prettier-ignore

    if (process.env.NODE_ENV === "test") {
      this.bind<IOsuApiFetcher>(TYPES.IOsuApiFetcher).to(FakeOsuApiFetcher).inSingletonScope(); // prettier-ignore
      this.bind<IOsuLobbyScanner>(TYPES.IOsuLobbyScanner).to(FakeOsuLobbyScanner).inSingletonScope(); // prettier-ignore
    } else {
      this.bind<IOsuApiFetcher>(TYPES.IOsuApiFetcher).to(NodesuApiFetcher).inSingletonScope(); // prettier-ignore
      this.bind<IOsuLobbyScanner>(TYPES.IOsuLobbyScanner).to(OsuLobbyScannerService).inSingletonScope(); // prettier-ignore
    }
  }

  async initDatabaseClientConnection(): Promise<Connection> {
    const dbClient = this.get<IDbClient>(TYPES.IDbClient);
    return await dbClient.connectIfNotConnected();
  }
}

const iocContainer = new IOCKernel();
export default iocContainer;
