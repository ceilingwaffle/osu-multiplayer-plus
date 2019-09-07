import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { CreationTimestampedEntity } from "../shared/creation-timestamped-entity";
import { CommunicationClientType } from "../../communication-types";
import { Realm } from "./realm.entity";

@Entity("realm_servers")
export class RealmServer extends CreationTimestampedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  serverType: CommunicationClientType;

  @ManyToOne(type => Realm, realm => realm.servers)
  realm: Realm;
}
