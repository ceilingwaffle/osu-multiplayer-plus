import "reflect-metadata";
import { Container } from "inversify";
import { buildProviderModule, autoProvide } from "inversify-binding-decorators";
import * as entities from "./inversify.entities";

const iocContainer = new Container();

autoProvide(iocContainer, entities);
iocContainer.load(buildProviderModule());

export default iocContainer;
