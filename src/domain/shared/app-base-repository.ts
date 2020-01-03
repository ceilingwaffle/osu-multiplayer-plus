import { Repository, Entity, ObjectType } from "typeorm";
import { Log } from "../../utils/log";
import { Helpers } from "../../utils/helpers";
import cloneDeep = require("lodash/cloneDeep");

export class AppBaseRepository<T> extends Repository<T> {
  // /**
  //  * Inserts new values for a TypeORM entity and returns the ids of the inserted records.
  //  * The ids may be null if the entity does not contain an "id" column (e.g. if the entity id is comprised of a composite key).
  //  *
  //  * @template T
  //  * @param {{
  //  *     entityType: ObjectType<T>;
  //  *     tableName: string;
  //  *     values: T[];
  //  *     chunkSize?: number;
  //  *   }} {
  //  *     entityType,
  //  *     tableName,
  //  *     values,
  //  *     chunkSize = 100
  //  *   }
  //  * @returns {Promise<number[]>} Entity ids inserted
  //  * @memberof AppBaseRepository
  //  */
  // async chunkSave<T>({
  //   entityType,
  //   values,
  //   chunkSize = 100
  // }: {
  //   entityType: ObjectType<T>;
  //   values: T[];
  //   chunkSize?: number;
  // }): Promise<number[]> {
  //   try {
  //     // get table column names
  //     // this.manager.connection.getMetadata(entityType).columns.map(c => console.log(c));
  //     // const columnNames = this.manager.connection.getMetadata(entityType).columns.map(c => c.databaseName);
  //     // const columns: string[] = Helpers.unique(Helpers.flatten2Dto1D(values.map(v => Object.keys(v)))).filter(
  //     //   x => columnNames.includes(x) || columnNames.includes(x.concat("Id"))
  //     // );
  //     // if (!columns.includes("id")) columns.push("id");
  //     // the entity must have an "id" property for this to work
  //     const tableName = this.manager.connection.getMetadata(entityType).tableName;
  //     // TODO: Throw an error if "id" does not exist as a property on the entity.
  //     // TODO: Should be able to derive the table name from the entityType.
  //     // DONE - ISSUE - osu users getting added to the wrong team (always added to the last team)
  //     let id = (await this.getLastIdOfTable(tableName)) || 0;
  //     values.forEach(u => ((u as any).id = ++id));
  //     const insertedIds: number[] = [];
  //     let remainingValues = cloneDeep(values);
  //     while (remainingValues.length) {
  //       const chunk = remainingValues.splice(0, chunkSize);
  //       const insertResult = await this.createQueryBuilder()
  //         .insert()
  //         .into(entityType)
  //         .values(chunk)
  //         .execute();
  //       if (insertResult.identifiers && insertResult.identifiers[0] && insertResult.identifiers[0].id) {
  //         // The insert result only returns the last ID inserted of the chunk, so we need to "fill in" the missing ids
  //         let i = chunk.length;
  //         while (i--) {
  //           insertedIds.push(insertResult.identifiers[0].id - i);
  //         }
  //       }
  //     }
  //     return insertedIds;
  //   } catch (error) {
  //     Log.methodError(this.chunkSave, this.constructor.name, error);
  //     throw error;
  //   }
  // }
  // protected async getLastIdOfTable(tableName: string) {
  //   const results: any[] = await this.query(`SELECT MAX(${tableName}.id) maxId FROM ${tableName}`);
  //   if (results.length !== 1) throw new Error("Query should not generate more than one result here. This should never happen.");
  //   let id = results[0].maxId;
  //   return id;
  // }
}
