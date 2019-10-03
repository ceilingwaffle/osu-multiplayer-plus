import { Entity, ManyToOne } from "typeorm";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { Game } from "./game.entity";
import { Match } from "../match/match.entity";
import { Realm } from "../realm/realm.entity";
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
  @ManyToOne(type => Game, game => game.gameMatchesReported, { primary: true })
  game: Game;

  @ManyToOne(type => Match, match => match.gameMatchesReported, { primary: true })
  match: Match;

  @ManyToOne(type => Realm, { nullable: true })
  reportedToRealms: Realm[];
}
