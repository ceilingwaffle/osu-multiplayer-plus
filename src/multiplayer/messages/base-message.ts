import { MultiplayerMessage } from "./multiplayer-message";

export abstract class BaseMessage implements MultiplayerMessage {
  abstract buildMessage(): string;
}
