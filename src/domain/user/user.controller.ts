import { TYPES } from "../../types";
import { UpdateUserDto } from "./dto/update-user.dto";
import { RequestDto } from "../../requests/dto";
import { Response } from "../../requests/Response";
import { UpdateUserReport } from "./reports/update-user.report";
import { UserService } from "./user.service";
import { RequesterFactory } from "../../requests/requester-factory";
import { Log } from "../../utils/Log";
import { FailureMessage, Message } from "../../utils/message";
import { UserResponseFactory } from "./user-response-factory";
import { injectable, inject } from "inversify";
import { DiscordRequestDto } from "../../requests/dto/discord-request.dto";

@injectable()
export class UserController {
  constructor(
    @inject(TYPES.UserService) private userService: UserService,
    @inject(TYPES.RequesterFactory) private requesterFactory: RequesterFactory
  ) {
    Log.info(`Initialized ${this.constructor.name}.`);
  }

  async update(userData: { userDto: UpdateUserDto; requestDto: RequestDto }): Promise<Response<UpdateUserReport>> {
    try {
      if (!userData.userDto.targetGameId) {
        // TODO: Finish update user method
        throw new Error(
          "At the present time, this method is only implemented to update the user's target game ID. Will do more in future."
        );
      }

      // TODO: The controller shouldn't care about what type of request it was (web, discord, etc). Need some way of passing a union type into the request factory here.
      const requester = this.requesterFactory.create(userData.requestDto as DiscordRequestDto);

      // get/create the user updating the user
      const updaterResult = await requester.getOrCreateUser();
      if (updaterResult.failed()) {
        if (updaterResult.value.error) throw updaterResult.value.error;
        Log.methodFailure(this.update, this.constructor.name, updaterResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("userUpdateFailed"),
          errors: {
            messages: [updaterResult.value.reason],
            validation: updaterResult.value.validationErrors
          }
        };
      }

      // TODO: Write a proper full user-update procedure
      // for now, just update the user's target game
      const userUpdateResult = await this.userService.updateUserTargetGame({
        userId: updaterResult.value.id,
        gameId: userData.userDto.targetGameId
      });

      if (userUpdateResult.failed()) {
        if (userUpdateResult.value.error) throw userUpdateResult.value.error;
        Log.methodFailure(this.update, this.constructor.name, userUpdateResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("userUpdateFailed"),
          errors: {
            messages: [userUpdateResult.value.reason],
            validation: userUpdateResult.value.validationErrors
          }
        };
      }

      const updatedUser = userUpdateResult.value;
      Log.methodSuccess(this.update, this.constructor.name);
      return {
        success: true,
        message: Message.get("userUpdateSuccess"),
        result: ((): UpdateUserReport => {
          const responseFactory = new UserResponseFactory(requester, updatedUser, userData.requestDto);
          // TODO: Include before and after User proprety values (old value -> new value)
          return {
            userId: updatedUser.id,
            updatedBy: responseFactory.getUpdatedBy(),
            updatedAgo: responseFactory.getUpdatedAgoText(),
            targettingGameId: responseFactory.getTargetGameId()
          };
        })()
      };
    } catch (error) {
      Log.methodError(this.update, this.constructor.name, error);
      return {
        success: false,
        message: FailureMessage.get("userUpdateFailed"),
        errors: {
          messages: [error]
        }
      };
    }
  }
}
