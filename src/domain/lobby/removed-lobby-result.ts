import { Lobby } from "./lobby.entity";

export interface RemovedLobbyResult {
  lobby: Lobby;
  gameIdRemovedFrom: number;
}
