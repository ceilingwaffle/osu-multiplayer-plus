import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { IsNumberString } from "class-validator";
import { LobbyStatus } from "./lobby-status";
import { Type } from "class-transformer";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { IsValidBanchoMultiplayerId } from "../../osu/validators/bancho-multiplayer-id.validator";
import { GameLobby } from "../game/game-lobby.entity";
import { Match } from "../match/match.entity";

@Entity("lobbies")
export class Lobby extends CreationTimestampedEntity {
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

  @OneToMany(type => GameLobby, gameLobby => gameLobby.lobby, { cascade: true })
  gameLobbies: GameLobby[];

  @OneToMany(type => Match, match => match.lobby)
  matches: Match[];
}
