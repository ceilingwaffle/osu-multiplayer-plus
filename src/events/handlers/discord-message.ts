import { RichEmbed, RichPresenceAssets } from "discord.js";
import { ReportableContext } from "../../multiplayer/reports/reportable-context";
import { ReportableContextType } from "../../multiplayer/reports/reportable-context-type";
import { LobbyBeatmapStatusMessage } from "../../multiplayer/messages/classes/lobby-beatmap-status-message";
import { LobbyAwaitingBeatmapMessage } from "../../multiplayer/messages/lobby-awaiting-beatmap-message";
import { Helpers } from "../../utils/helpers";
import { IGameEvent } from "../../multiplayer/game-events/interfaces/game-event-interface";
import { TeamEliminatedGameEvent } from "../../multiplayer/game-events/team-eliminated.game-event";
import { TeamIsGameChampionGameEvent } from "../../multiplayer/game-events/team-is-game-champion.game-event";
import { TeamScoredHighestGameEvent } from "../../multiplayer/game-events/team-scored-highest.game-event";
import { TeamScoredLowestGameEvent } from "../../multiplayer/game-events/team-scored-lowest.game-event";
import { TeamScoresSubmittedGameEvent } from "../../multiplayer/game-events/team-scores-submitted.game-event";
import { TeamScoresTiedGameEvent } from "../../multiplayer/game-events/team-scores-tied.game-event";
import { Leaderboard } from "../../multiplayer/components/leaderboard";
import { MessageType } from "../../multiplayer/messages/types/message-type";
import { DiscordLeaderboardMessageBuilder } from "../../multiplayer/leaderboard/discord-leaderboard-message-builder";

export class DiscordMessage {
  public message: RichEmbed;

  constructor(private reportables: ReportableContext<ReportableContextType>[]) {
    this.message = new RichEmbed();

    for (const reportable of reportables) {
      if (reportable.type === "game_event") {
        this.addGameEventPart(reportable);
      } else if (reportable.type === "message") {
        this.addMessagePart(reportable);
      } else if (reportable.type === "leaderboard") {
        this.addLeaderboardPart(reportable);
      } else {
        const _exhaustiveCheck: never = reportable.type;
      }
    }
  }

  getReportables(): ReportableContext<ReportableContextType>[] {
    return this.reportables;
  }

  getRichEmbed(): RichEmbed {
    return this.message;
  }

  private addLeaderboardPart(reportable: ReportableContext<ReportableContextType>) {
    const leaderboard = reportable.item as Leaderboard;
    const messageValue = DiscordLeaderboardMessageBuilder.build(leaderboard);
    this.message.addField("TODO: Put some map/leaderboard metadata here...", messageValue);
  }

  private addMessagePart(reportable: ReportableContext<ReportableContextType>) {
    const r = reportable.item as LobbyBeatmapStatusMessage<MessageType>;
    let messageValue = new String();
    if (r.type === "all_lobbies_completed") {
      messageValue = messageValue.concat(`✅`);
    } else if (r.type === "lobby_awaiting") {
      messageValue = messageValue.concat(`⌛`);
    } else if (r.type === "lobby_completed") {
      messageValue = messageValue.concat(`🦞`);
    } else if (r.type === "match_aborted") {
      messageValue = messageValue.concat(`🛑`);
    } else {
      const _exhaustiveCheck: never = r.type;
      return _exhaustiveCheck;
    }

    messageValue = messageValue.concat(` `, `${r.message}`, ` `, `${Helpers.getTimeAgoTextForTime(r.time)}`);
    this.message.addField(messageValue, "TODO: Put some message metadata here...");
  }

  private addGameEventPart(reportable: ReportableContext<ReportableContextType>) {
    const gameEvent = reportable.item as IGameEvent;
    let messageValue = new String();
    // TODO - replace all this stuff below with getting emoji from GameEventTypeDataMapper
    if (gameEvent.type === "team_eliminated") {
      const ge = gameEvent as TeamEliminatedGameEvent;
      messageValue = messageValue.concat(`💀`, ` `, `Team ${ge.data.teamId} was eliminated!`); // TODO: Team number with player names
    } else if (gameEvent.type === "team_game_champion_declared") {
      const ge = gameEvent as TeamIsGameChampionGameEvent;
      messageValue = messageValue.concat(`🏆`, ` `, `Game over! The winner is Team ${ge.data.teamId}!`);
    } else if (gameEvent.type === "team_on_winning_streak") {
      messageValue = messageValue.concat(`🌟`, ` `, `Team is on a winning streak!`); // TODO
    } else if (gameEvent.type === "team_scored_highest") {
      const ge = gameEvent as TeamScoredHighestGameEvent;
      messageValue = messageValue.concat(`⭐`, ` `, `Team ${ge.data.teamId} won the match!`);
    } else if (gameEvent.type === "team_scored_lowest") {
      const ge = gameEvent as TeamScoredLowestGameEvent;
      messageValue = messageValue.concat(`💥`, ` `, `Team ${ge.data.teamId} lost a life!`);
    } else if (gameEvent.type === "team_scores_submitted") {
      const ge = gameEvent as TeamScoresSubmittedGameEvent;
      messageValue = messageValue.concat(`  `, ` `, `Teams submitted scores.`); // TODO
    } else if (gameEvent.type === "team_scores_tied") {
      const ge = gameEvent as TeamScoresTiedGameEvent;
      messageValue = messageValue.concat(`👔`, ` `, `Some teams had tied scores.`); // TODO
    } else {
      const _exhaustiveCheck: never = gameEvent.type;
      return _exhaustiveCheck;
    }

    this.message.addField(messageValue, "TODO: Put some event/team metadata here...");
  }
}
