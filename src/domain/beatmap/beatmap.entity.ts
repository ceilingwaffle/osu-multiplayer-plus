import { Entity, PrimaryGeneratedColumn, Column, OneToMany, BaseEntity } from "typeorm";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { IsUrl, IsPositive } from "class-validator";
import { Match } from "../match/match.entity";

@Entity("beatmaps")
export class Beatmap extends BaseEntity {
  // extends CreationTimestampedEntity
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(
    type => Match,
    match => match.beatmap
  )
  matches: Match[];

  @Column()
  beatmapId: string;

  @Column({ nullable: true })
  beatmapSetId?: string;

  // @IsUrl()
  @Column({ nullable: true })
  beatmapUrl?: string;

  // @IsPositive()
  @Column({ nullable: true })
  stars?: number;

  @Column({ nullable: true })
  diffName?: string;

  // @Column()
  // mapString: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  artist?: string;

  // @IsUrl()
  @Column({ nullable: true })
  backgroundThumbnailUrlLarge?: string;

  // @IsUrl()
  @Column({ nullable: true })
  backgroundThumbnailUrlSmall?: string;
}
