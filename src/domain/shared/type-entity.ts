import { PrimaryColumn, Column, BaseEntity } from "typeorm";

export abstract class TypeEntity extends BaseEntity {
  @PrimaryColumn()
  id: number;

  @Column({ unique: true })
  key: string;

  @Column()
  text: string;
}
