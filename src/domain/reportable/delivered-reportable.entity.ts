import { Entity, ManyToOne, Column, PrimaryGeneratedColumn, BaseEntity } from "typeorm";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { Game } from "../game/game.entity";
import { Match } from "../match/match.entity";
import { Realm } from "../realm/realm.entity";
import { ReportableType } from "../../multiplayer/reporting/reportable-type";
import { ReportableContext } from "../../multiplayer/reporting/reportable-context";
import { ReportableContextType } from "../../multiplayer/reporting/reportable-context-type";

/**
 * Entity used to denote which matches have been "reported" for a game. "Reported" meaning that a leaderboard and lobby-messages
 * like "Lobby 1 completed beatmap2#1" have been delivered to some realm. This is needed so that we don't send duplicate
 * reports for matches that we've already sent a report for during the osu API multiplayer results processing.
 *
 * @export
 * @class GameMatchReported
 * @extends {CreationTimestampedEntity}
 */
@Entity("games_matches_reported")
export class DeliveredReportable extends BaseEntity {
  // extends CreationTimestampedEntity
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    type => Game,
    game => game.deliveredReportables
  )
  game: Game;

  // @Column({ type: "simple-enum", enum: ReportableType })
  // reportedType: ReportableType;

  @Column("simple-json")
  reportedContext: ReportableContext<ReportableContextType>;

  // @ValidateIf(gameMatch => gameMatch.reportedToRealms)
  @ManyToOne(type => Realm, { nullable: true })
  reportedToRealms: Realm[];
}
