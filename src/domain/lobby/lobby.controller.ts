import { AddLobbyDto } from "./dto/add-lobby.dto";
import { RequestDtoType } from "../../requests/dto/request.dto";
import { Response } from "../../requests/Response";
import { Lobby } from "./lobby.entity";

export class LobbyController {
  async addLobby(request: { lobbyData: AddLobbyDto; requestDto: RequestDtoType }): Promise<Response<Lobby>> {
    return null;
  }
}
