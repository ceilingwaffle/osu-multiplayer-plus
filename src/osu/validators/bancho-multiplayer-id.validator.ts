import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments
} from "class-validator";
import { IOsuApiFetcher } from "../interfaces/osu-api-fetcher";
import { Lobby } from "../../domain/lobby/lobby.entity";
import { Log } from "../../utils/Log";
import { inject } from "inversify";
import TYPES from "../../types";

@ValidatorConstraint({ async: true })
export class IsValidBanchoMultiplayerIdConstraint implements ValidatorConstraintInterface {
  constructor(@inject(TYPES.IOsuApiFetcher) private readonly osuApi: IOsuApiFetcher) {}

  async validate(banchoMultiplayerId: string, args: ValidationArguments): Promise<boolean> {
    // Check if the multiplayer id was previously-added to a lobby (and was therefore previously validated).
    // Otherwise, validate using the osu API.
    const lobby = await Lobby.findOne({ banchoMultiplayerId: banchoMultiplayerId });
    if (lobby) Log.debug(`Validated Bancho MP ${banchoMultiplayerId} from DB.`);
    return !!lobby || this.osuApi.isValidBanchoMultiplayerId(banchoMultiplayerId);
  }

  defaultMessage(args: ValidationArguments) {
    // TODO: include a reason for failed validation
    return "$value is not a valid multiplayer ID.";
  }
}

export function IsValidBanchoMultiplayerId(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidBanchoMultiplayerIdConstraint
    });
  };
}
