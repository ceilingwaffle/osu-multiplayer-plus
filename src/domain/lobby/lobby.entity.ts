import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { IsNumberString } from "class-validator";
import { LobbyStatus } from "./lobby-status";
import { Type } from "class-transformer";
import { AbstractEntity } from "../shared/abstract-entity";
import { IsValidBanchoMultiplayerId } from "../../osu/validators/bancho-multiplayer-id.validator";
import { GameLobby } from "../game/game-lobby.entity";

@Entity("lobbies")
export class Lobby extends AbstractEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @IsNumberString()
  @Type(() => Number)
  @IsValidBanchoMultiplayerId()
  @Column({ unique: true })
  banchoMultiplayerId: string;

  /**
   * Status of the lobby. Should be in-sync with the Bancho lobby status.
   *
   * @type {string}
   */
  @Column({ default: LobbyStatus.UNKNOWN.getKey() })
  status: string;

  @OneToMany(type => GameLobby, gameLobby => gameLobby.lobby)
  gameLobbies: GameLobby[];
}
