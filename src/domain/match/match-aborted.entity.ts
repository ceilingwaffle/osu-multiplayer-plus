import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToOne, Column } from "typeorm";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { User } from "../user/user.entity";
import { Match } from "./match.entity";

@Entity("matches_aborted")
export class MatchAborted extends CreationTimestampedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: false })
  isAborted: boolean;

  // /** A user can manually undo a match abort */
  // @ManyToOne(type => User)
  // @JoinColumn({ name: "undone_by_user_id" })
  // undoneBy: User;

  @OneToOne(type => Match, match => match.matchAbortion)
  match: Match;
}
