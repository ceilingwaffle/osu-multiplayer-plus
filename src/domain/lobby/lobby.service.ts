import { LobbyRepository } from "./lobby.repository";
import { getCustomRepository } from "typeorm";
import { Either } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { AddLobbyDto } from "./dto/add-lobby.dto";
import { Lobby } from "./lobby.entity";
import { LobbyStatus } from "./lobby-status";
import { User } from "../user/user.entity";
import { Game } from "../game/game.entity";

export class LobbyService {
  private readonly lobbyRepository: LobbyRepository = getCustomRepository(LobbyRepository);

  constructor() {}

  public create(lobbyData: AddLobbyDto, createdBy: User, games: Game[]): Lobby {
    const lobby = new Lobby();

    lobby.addedBy = createdBy;
    lobby.banchoMultiplayerId = lobbyData.banchoMultiplayerId;
    lobby.status = LobbyStatus.AWAITING_SCANNER_INIT;
    lobby.games = games;

    return lobby;
  }

  //   public async startLobbyScanner(lobbyData: AddLobbyDto, requestData: RequestDto): Promise<Either<Failure<LobbyFailure>, Lobby>> {
  //     throw new Error("Method not implemented.");

  //     // validate bancho multiplayer exists

  //     // validate bancho multiplayer is not closed/inactive

  //     // save lobby in DB

  //     // start lobby scanner
  //   }
}
