import { Repository, EntityRepository, getRepository } from "typeorm";
import { User } from "./user.entity";
import { Game } from "../game/game.entity";
import { Log } from "../../utils/log";
import { AppBaseRepository } from "../shared/app-base-repository";

@EntityRepository(User)
export class UserRepository extends AppBaseRepository<User> {
  async updateUser({
    user,
    updateWith,
    relations = ["targetGame", "discordUser", "webUser"]
  }: {
    user: User;
    updateWith: {
      targetGame?: Game;
    };
    relations?: string[];
  }): Promise<User> {
    try {
      // TODO: Add more User props to be updated
      if (updateWith.targetGame) user.targetGame = updateWith.targetGame;
      const savedUser = await user.save();
      return this.findOne({ id: savedUser.id }, { relations: relations });
    } catch (error) {
      Log.methodError(this.updateUser, this.constructor.name, error);
      throw error;
    }
  }
}
