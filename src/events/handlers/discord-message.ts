import { RichEmbed, RichPresenceAssets, Attachment } from "discord.js";
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
import { DiscordLeaderboardImageBuilder } from "../../multiplayer/leaderboard/discord-leaderboard-image-builder";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { VirtualMatchCreator } from "../../multiplayer/virtual-match/virtual-match-creator";
import { Beatmap } from "../../multiplayer/components/beatmap";

export class DiscordMessage {
  public embeds: RichEmbed[];

  constructor(private reportables: ReportableContext<ReportableContextType>[]) {}

  async pushEmbedsFromReportables(): Promise<void> {
    this.embeds = [];

    // group reportables by VM key - each group is the "reactangle" message sent in Discord
    const vmGroupedReportables = _(this.reportables)
      .groupBy(reportable =>
        VirtualMatchCreator.createSameBeatmapKeyString({
          beatmapId: reportable.beatmapId,
          sameBeatmapNumber: reportable.sameBeatmapNumber
        })
      )
      .toArray()
      .value();

    for (const messageReportables of vmGroupedReportables) {
      const newEmbed = new RichEmbed();
      // add beatmap title header to message if it contains a leaderboard
      for (const reportable of messageReportables) {
        if (reportable.type === "leaderboard") {
          // fetch the beatmap info
          const leaderboard = reportable.item as Leaderboard;
          this.addBeatmapTitle(leaderboard.beatmapPlayed, newEmbed);
          break;
        }
      }

      for (const reportable of messageReportables) {
        if (reportable.type === "game_event") {
          this.addGameEventPart(reportable, newEmbed);
        } else if (reportable.type === "message") {
          this.addMessagePart(reportable, newEmbed);
        } else if (reportable.type === "leaderboard") {
          await this.addLeaderboardPart(reportable, newEmbed);
        } else {
          const _exhaustiveCheck: never = reportable.type;
        }
      }
      this.embeds.push(newEmbed);
    }
  }

  addBeatmapTitle(beatmapPlayed: Beatmap, targetEmbed: RichEmbed): void {
    const b = beatmapPlayed;
    const mapString = `${b.artist} - ${b.title} [${b.diffName}] (${Number(b.stars).toFixed(2)}⭐)`; // TODO: Add mods used
    targetEmbed.setTitle(mapString);
    targetEmbed.setURL(beatmapPlayed.beatmapUrl);
    targetEmbed.setThumbnail(beatmapPlayed.backgroundThumbnailUrlLarge);
  }

  getReportables(): ReportableContext<ReportableContextType>[] {
    return this.reportables;
  }

  getRichEmbeds(): RichEmbed[] {
    return this.embeds;
  }

  private async addLeaderboardPart(reportable: ReportableContext<ReportableContextType>, targetEmbed: RichEmbed): Promise<void> {
    const leaderboard = reportable.item as Leaderboard;
    // const messageValue = DiscordLeaderboardMessageBuilder.build(leaderboard);

    const leaderboardImageData = DiscordLeaderboardImageBuilder.buildImageDataObjectFromLeaderboard(leaderboard);
    const pngBuffer = await DiscordLeaderboardImageBuilder.build(leaderboardImageData);

    const leaderboardAttachmentName = "leaderboard.png";
    const leaderboardAttachment = new Attachment(pngBuffer, leaderboardAttachmentName);
    targetEmbed.attachFile(leaderboardAttachment);
    targetEmbed.setImage(`attachment://${leaderboardAttachmentName}`);
    // this.message.addField("TODO: Put some map/leaderboard metadata here...", messageValue);
  }

  private addMessagePart(reportable: ReportableContext<ReportableContextType>, targetEmbed: RichEmbed): void {
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
    targetEmbed.addField(messageValue, "TODO: Put some message metadata here...");
  }

  private addGameEventPart(reportable: ReportableContext<ReportableContextType>, targetEmbed: RichEmbed): void {
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

    targetEmbed.addField(messageValue, "TODO: Put some event/team metadata here...");
  }
}
