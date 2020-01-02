import iocContainer from "../../../inversify.config";
import { TYPES } from "../../../types";
import { Command, CommandoClient, CommandMessage } from "discord.js-commando";
import { Message, RichEmbed } from "discord.js";
import { DiscordRequestDto } from "../../../requests/dto";
import { ErrorDiscordMessageBuilder } from "../../message-builders/error.discord-message-builder";
import { UpdateGameDto } from "../../../domain/game/dto";
import { UpdateGameDiscordMessageBuilder } from "../../message-builders/game/update-game.discord-message-builder";
import { GameController } from "../../../domain/game/game.controller";

type PropertyNames = "lives" | "countfailed";
const AllowedPropertyNames: PropertyNames[] = ["lives", "countfailed"];

export class EditGameCommand extends Command {
  private gameController = iocContainer.get<GameController>(TYPES.GameController);

  constructor(commando: CommandoClient) {
    super(commando, {
      name: "editgame",
      group: "osu",
      memberName: "editgame",
      description: "Edits the properties of a game, like how many lives each team starts with.",
      details: "Use !obr targetgame <gameId> to set properties on that game, otherwise your most recently created game will be used.",
      examples: ["!obr editgame lives 5", "!obr editgame countfailed true", "!obr editgame countfailed false"],
      guildOnly: true,
      argsPromptLimit: 0,
      args: [
        {
          key: "property",
          prompt: `The property to edit (e.g. ${AllowedPropertyNames.join(", ")})`,
          type: "string",
          validate: (text: string) => {
            if (text as PropertyNames) return true;
            return "Must be one of: " + AllowedPropertyNames.join(", ");
          }
        },
        {
          key: "value",
          prompt: "The value of the property (e.g. 5, true, false)",
          type: "integer|string",
          validate: (text: number | string, message: CommandMessage) => {
            const parts = message.content.split(" ");
            if (parts.length < 4) return "Unexpected number of arguments.";
            const prop = parts[2].toLowerCase() as PropertyNames;
            const value = parts[3];
            if (prop === "lives") {
              return !(Number.parseInt(value) && Number.parseInt(value) > 0) ? "Value of 'lives' should be a positive whole number." : true;
            } else if (prop === "countfailed") {
              return value !== "true" && value !== "false" ? "Value of 'countFailed' should be true or false." : true;
            } else {
              // if the compiler complains here, you forgot to handle validating a property name you probably just added
              const _exhaustiveCheck: never = prop;
              return _exhaustiveCheck;
            }
          }
        }
      ]
    });
  }

  public async run(
    message: CommandMessage,
    args: {
      property: string;
      value: number | "true" | "false";
    }
  ): Promise<Message | Message[]> {
    const property = args.property.toLowerCase() as PropertyNames;
    if (!property || !AllowedPropertyNames.includes(property)) {
      throw new Error(
        `${args.property} was not an expected property name. Should be one of: ${Object.values(AllowedPropertyNames).join(", ")}`
      );
    }

    const requestDto: DiscordRequestDto = {
      commType: "discord",
      authorId: message.author.id,
      originChannelId: message.channel.id
    };

    const updateGameDto: UpdateGameDto = {
      countFailedScores: (property as PropertyNames) === "countfailed" ? (args.value as string) : null,
      teamLives: (property as PropertyNames) === "lives" && (args.value as number) ? (args.value as number) : null
    };

    const updateGameResponse = await this.gameController.update({ updateGameDto: updateGameDto, requestDto: requestDto });

    let toBeSent: RichEmbed;
    if (!updateGameResponse || !updateGameResponse.success) {
      // game was not created
      toBeSent = new ErrorDiscordMessageBuilder().from(updateGameResponse, this).buildDiscordMessage(message);
      return message.embed(toBeSent);
    }

    toBeSent = new UpdateGameDiscordMessageBuilder().from(updateGameResponse, this).buildDiscordMessage(message);
    return message.embed(toBeSent);
  }
}
