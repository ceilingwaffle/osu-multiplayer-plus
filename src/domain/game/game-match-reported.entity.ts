import { Entity, ManyToOne, Column, PrimaryGeneratedColumn } from "typeorm";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { Game } from "./game.entity";
import { Match } from "../match/match.entity";
import { Realm } from "../realm/realm.entity";
import { MessageType } from "../../multiplayer/lobby-beatmap-status-message";
import { GameEventType } from "../../multiplayer/game-events/game-event-types";
import { VirtualMatchKey } from "../../multiplayer/virtual-match-key";

export enum ReportedType {
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

  @Column({ type: "simple-enum", enum: ReportedType })
  reportedType: ReportedType;

  @Column("simple-json")
  reportedContext: ReportedContext<ReportedContextType>;

  @ManyToOne(type => Realm, { nullable: true })
  reportedToRealms: Realm[];
}

export type ReportedContextType = "message" | "game_event";

export type ReportedContext<T extends ReportedContextType> = VirtualMatchKey & {
  type: T;
  subType: T extends "message" ? MessageType : T extends "game_event" ? GameEventType : never;
};

// const foo: ReportedContext<"message"> = {
//   sameBeatmapNumber: 1,
//   beatmapId: "foo",
//   subType: "all_lobbies_completed"
// };
