import { Repository, EntityRepository } from "typeorm";
import { Lobby } from "./lobby.entity";

@EntityRepository(Lobby)
export class LobbyRepository extends Repository<Lobby> {}
