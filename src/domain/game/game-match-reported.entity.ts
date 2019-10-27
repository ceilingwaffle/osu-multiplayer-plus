import { Entity, ManyToOne, Column, PrimaryGeneratedColumn } from "typeorm";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { Game } from "./game.entity";
import { Match } from "../match/match.entity";
import { Realm } from "../realm/realm.entity";
import { MessageType } from "../../multiplayer/messages/types/message-type";
import { LobbyBeatmapStatusMessage } from "../../multiplayer/messages/classes/lobby-beatmap-status-message";
import { GameEventType } from "../../multiplayer/game-events/types/game-event-types";
import { VirtualMatchKey } from "../../multiplayer/virtual-match/virtual-match-key";
import { IGameEvent } from "../../multiplayer/game-events/interfaces/game-event-interface";
import { GameModeType } from "./modes/game-mode-types";
import { Leaderboard } from "../../multiplayer/components/leaderboard";

export enum ReportableType {
  "message" = "message",
  "event" = "event"
}

/**
 * Entity used to denote which matches have been"reported" for a game. "Reported" meaning that a leaderboard and lobby-messages
 * like "Lobby 1 completed beatmap2#1" have been delivered to some realm. This is needed so that we don't send duplicate
 * reports for matches that we've already sent a report for during the osu API multiplayer results processing.
 *
 * @export
 * @class GameMatchReported
 * @extends {CreationTimestampedEntity}
 */
@Entity("games_matches_reported")
export class GameMatchReported extends CreationTimestampedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(type => Game, game => game.gameMatchesReported)
  game: Game;

  @ManyToOne(type => Match, match => match.gameMatchesReported)
  match: Match;

  @Column({ type: "simple-enum", enum: ReportableType })
  reportedType: ReportableType;

  @Column("simple-json")
  reportedContext: ReportableContext<ReportableContextType>;

  // @ValidateIf(gameMatch => gameMatch.reportedToRealms)
  @ManyToOne(type => Realm, { nullable: true })
  reportedToRealms: Realm[];
}

export type ReportableContextType = "message" | "game_event" | "leaderboard";

export type ReportableContext<T extends ReportableContextType> = VirtualMatchKey & {
  /** Message or GameEvent */
  type: T;
  /** The specific type of Message or GameEvent */
  subType: T extends "message" ? MessageType 
         : T extends "game_event" ? GameEventType 
         : T extends "leaderboard" ? GameModeType 
         : never; // prettier-ignore
  /** The original message/event object */
  item: T extends "message" ? LobbyBeatmapStatusMessage<MessageType> 
      : T extends "game_event" ? IGameEvent 
      : T extends "leaderboard" ? Leaderboard 
      : never; // prettier-ignore
  /** The time in which the message/event occurred */
  time: number;
};
