import "reflect-metadata";
import { buildProviderModule, autoProvide } from "inversify-binding-decorators";
import { Container } from "inversify";
import { IOsuLobbyScanner } from "./osu/interfaces/osu-lobby-scanner";
import { OsuLobbyScannerService } from "./osu/osu-lobby-scanner-service";
import * as entities from "./inversify.entities";
import { TYPES } from "./types";

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
    autoProvide(this, entities);
    this.load(buildProviderModule());
  }

  private declareDependencies() {
    this.bind<IOsuLobbyScanner>(TYPES.IOsuLobbyScanner)
      .to(OsuLobbyScannerService)
      .inSingletonScope();
  }
}

const iocContainer = new IOCKernel();
export default iocContainer;
