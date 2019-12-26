import { BaseEntity, Column, BeforeInsert, BeforeUpdate } from "typeorm";
import { Helpers } from "../../utils/helpers";
import { IsInt, IsPositive } from "class-validator";

export abstract class CreationTimestampedEntity extends BaseEntity {
  // @ValidateIf(o => o.createdAt)
  @Column({ name: "created_at", type: "bigint", unsigned: true, nullable: false })
  public createdAt: number;

  // @ValidateIf(o => o.updatedAt)
  @Column({ name: "updated_at", type: "bigint", unsigned: true, nullable: false })
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
