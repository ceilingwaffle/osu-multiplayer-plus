import { GameEventType } from "../types/game-event-types";
import { GameEventIcon } from "../../components/game-event-icon";
import { IGameEvent } from "../interfaces/game-event-interface";
import { TeamEliminatedGameEvent } from "../team-eliminated.game-event";
import { TeamIsGameChampionGameEvent } from "../team-is-game-champion.game-event";
import { TeamScoredHighestGameEvent } from "../team-scored-highest.game-event";
import { TeamScoredLowestGameEvent } from "../team-scored-lowest.game-event";
import { TeamScoresSubmittedGameEvent } from "../team-scores-submitted.game-event";
import { TeamScoresTiedGameEvent } from "../team-scores-tied.game-event";
import { GameEvent } from "./game-event";

export class GameEventTypeDataMapper {
  static getGameEventIconDataForEvent(gameEvent: IGameEvent): GameEventIcon {
    const gameEventType = gameEvent.type;
    if (gameEventType === "team_eliminated") {
      return {
        eventEmoji: `💀`,
        eventType: "team_eliminated",
        eventDescription: "A team was eliminated.",
        event: gameEvent as TeamEliminatedGameEvent
      };
    } else if (gameEventType === "team_game_champion_declared") {
      return {
        eventEmoji: `🏆`,
        eventType: "team_game_champion_declared",
        eventDescription: "A team won the game! Congratz!",
        event: gameEvent as TeamIsGameChampionGameEvent
      };
    } else if (gameEventType === "team_on_winning_streak") {
      throw new Error("team_on_winning_streak not yet implemented.");
      return {
        eventEmoji: `🌟`,
        eventType: "team_on_winning_streak",
        eventDescription: "A team is on a winning streak!",
        event: gameEvent as IGameEvent // TODO
      };
    } else if (gameEventType === "team_scored_highest") {
      return {
        eventEmoji: `⭐`,
        eventType: "team_scored_highest",
        eventDescription: "A team scored the highest.",
        event: gameEvent as TeamScoredHighestGameEvent
      };
    } else if (gameEventType === "team_scored_lowest") {
      return {
        eventEmoji: `💥`,
        eventType: "team_scored_lowest",
        eventDescription: "A team scored the lowest and lost a life.",
        event: gameEvent as TeamScoredLowestGameEvent
      };
    } else if (gameEventType === "team_scores_submitted") {
      return {
        eventEmoji: ``,
        eventType: "team_scores_submitted",
        eventDescription: "A team submitted a score.",
        event: gameEvent as TeamScoresSubmittedGameEvent
      };
    } else if (gameEventType === "team_scores_tied") {
      return {
        eventEmoji: `👔`,
        eventType: "team_scores_tied",
        eventDescription: "Some teams had tied scores.`",
        event: gameEvent as TeamScoresTiedGameEvent
      };
    } else {
      const _exhaustiveCheck: never = gameEventType;
      return _exhaustiveCheck;
    }
  }
}
