import { BaseEntity, Column, BeforeInsert, BeforeUpdate } from "typeorm";
import { Helpers } from "../../utils/helpers";

export abstract class CreationTimestampedEntity extends BaseEntity {
  @Column({ name: "created_at", nullable: true })
  public createdAt: number;

  @Column({ name: "updated_at", nullable: true })
  public updatedAt: number;

  @BeforeInsert()
  public setCreatedAt() {
    this.createdAt = Helpers.getNow();
    this.updatedAt = Helpers.getNow();
  }

  @BeforeUpdate()
  public setUpdatedAt() {
    this.updatedAt = Helpers.getNow();
  }
}
