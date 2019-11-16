import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

const config: PostgresConnectionOptions = {
  type: "postgres",
  host: process.env.POSTGRES_HOSTNAME,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DBNAME,
  synchronize: true, // this will keep database data but it will re-create the schema at every app launch. Same as: npm run typeorm schema:sync
  logger: "file",
  logging: ["query", "warn", "error"],
  entities: ["src/domain/**/*.entity.ts"],
  subscribers: ["src/domain/**/*.subscriber.ts"],
  migrations: ["src/database/migrations/**/*.ts"],
  // seeds: ["src/database/seeds/**/*.ts"],
  cli: {
    entitiesDir: "src/domain/**",
    migrationsDir: "src/database/migrations",
    subscribersDir: "src/domain/**"
  }
};

export default config;
