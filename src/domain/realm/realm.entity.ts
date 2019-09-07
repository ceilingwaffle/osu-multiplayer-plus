import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from "typeorm";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { RealmType } from "./realm-type";

@Entity()
export class Realm extends CreationTimestampedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  realmType: RealmType;
}
