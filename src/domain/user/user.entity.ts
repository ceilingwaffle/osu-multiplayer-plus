import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { IsInt, IsBoolean } from "class-validator";

@Entity("user")
export class User {
  @PrimaryGeneratedColumn()
  id: number;
}
