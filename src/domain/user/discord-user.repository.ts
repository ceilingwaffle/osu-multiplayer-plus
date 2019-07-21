import { Repository, EntityRepository } from "typeorm";
import { DiscordUser } from "./discord-user.entity";

@EntityRepository(DiscordUser)
export class DiscordUserRepository extends Repository<DiscordUser> {}
