import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, OneToMany, BaseEntity } from "typeorm";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { RealmServer } from "./realm-server.entity";

@Entity("realms")
export class Realm extends BaseEntity {
  // extends CreationTimestampedEntity
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany(
    type => RealmServer,
    server => server.realm
  )
  servers: RealmServer[];
}
