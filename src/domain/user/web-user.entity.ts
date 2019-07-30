import { Entity, OneToOne, PrimaryGeneratedColumn, Column, JoinColumn } from "typeorm";
import { User } from "./user.entity";

@Entity("web_users")
export class WebUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  webUuid: string;

  @OneToOne(type => User, user => user.webUser)
  @JoinColumn()
  user: User;
}
