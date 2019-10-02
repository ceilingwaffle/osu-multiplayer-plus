import { BaseMessage } from "./base-message";

export class LobbyCompletedBeatmapMessage extends BaseMessage {
  constructor() {
    super();
  }

  buildMessage(): string {
    throw new Error("Method not implemented.");
  }
}
