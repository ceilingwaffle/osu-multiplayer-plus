import { Repository, Entity, ObjectType } from "typeorm";
import { Log } from "../../utils/Log";

export class AppBaseRepository<T> extends Repository<T> {
  protected async getLastIdOfTable(tableName: string) {
    const results: any[] = await this.query(`SELECT MAX(${tableName}.id) maxId FROM ${tableName}`);
    if (results.length !== 1) throw new Error("Query should not generate more than one result here. This should never happen.");
    let id = results[0].maxId;
    return id;
  }

  /**
   * Inserts new values for a TypeORM entity and returns the ids of the inserted records.
   *
   * @template T
   * @param {{
   *     entityType: ObjectType<T>;
   *     tableName: string;
   *     values: T[];
   *     chunkSize?: number;
   *   }} {
   *     entityType,
   *     tableName,
   *     values,
   *     chunkSize = 100
   *   }
   * @returns {Promise<number[]>} Entity ids inserted
   * @memberof AppBaseRepository
   */
  async chunkSave<T>({
    entityType,
    tableName,
    values,
    chunkSize = 100
  }: {
    entityType: ObjectType<T>;
    tableName: string;
    values: T[];
    chunkSize?: number;
  }): Promise<number[]> {
    try {
      // the entity must have an "id" property for this to work
      // TODO: Throw an error if "id" does not exist as a property on the entity.
      // TODO: Should be able to derive the table name from the entityType.
      let id = await this.getLastIdOfTable(tableName);
      values.forEach(u => ((u as any).id = ++id));
      const insertedIds: number[] = [];
      let remainingValues = [].concat(values);
      while (remainingValues.length) {
        const chunk = remainingValues.splice(0, chunkSize);
        const insertResult = await this.createQueryBuilder()
          .insert()
          .into(entityType)
          .values(chunk)
          .execute();
        if (!insertResult.identifiers[0].id) {
          throw new Error("Insert result does not have an id property. This should never happen.");
        }
        // TODO: Can we throw some specific error if the insert query failed (e.g. database offline)
        // The insert result only returns the last ID inserted of the chunk, so we need to "fill in" the missing ids
        let i = chunk.length;
        while (i--) {
          insertedIds.push(insertResult.identifiers[0].id - i);
        }
      }
      return insertedIds;
    } catch (error) {
      Log.methodError(this.chunkSave, this.constructor.name, error);
      throw error;
    }
  }
}
