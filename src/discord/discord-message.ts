import { RichEmbed, RichPresenceAssets, Attachment, Message } from "discord.js";
import { ReportableContext } from "../multiplayer/reporting/reportable-context";
import { ReportableContextType } from "../multiplayer/reporting/reportable-context-type";
import { LobbyBeatmapStatusMessage } from "../multiplayer/messages/classes/lobby-beatmap-status-message";
import { LobbyAwaitingBeatmapMessage } from "../multiplayer/messages/lobby-awaiting-beatmap-message";
import { Helpers } from "../utils/helpers";
import { IGameEvent } from "../multiplayer/game-events/interfaces/game-event-interface";
import { TeamEliminatedGameEvent } from "../multiplayer/game-events/team-eliminated.game-event";
import { TeamIsGameChampionGameEvent } from "../multiplayer/game-events/team-is-game-champion.game-event";
import { TeamScoredHighestGameEvent } from "../multiplayer/game-events/team-scored-highest.game-event";
import { TeamScoredLowestGameEvent } from "../multiplayer/game-events/team-scored-lowest.game-event";
import { TeamScoresSubmittedGameEvent } from "../multiplayer/game-events/team-scores-submitted.game-event";
import { TeamScoresTiedGameEvent } from "../multiplayer/game-events/team-scores-tied.game-event";
import { Leaderboard } from "../multiplayer/components/leaderboard";
import { MessageType } from "../multiplayer/messages/types/message-type";
import { DiscordLeaderboardMessageBuilder } from "../multiplayer/leaderboard/discord-leaderboard-message-builder";
import { DiscordLeaderboardImageBuilder } from "../multiplayer/leaderboard/discord-leaderboard-image-builder";
import _ = require("lodash"); // do not convert to default import -- it will break!!
import { VirtualMatchCreator } from "../multiplayer/virtual-match/virtual-match-creator";
import { Beatmap } from "../multiplayer/components/beatmap";
import { GameEvent } from "../multiplayer/game-events/classes/game-event";
import { Game } from "../domain/game/game.entity";
import { Log } from "../utils/log";
import { debug } from "util";
import { LobbyCompletedBeatmapMessage } from "../multiplayer/messages/lobby-completed-beatmap-message";
import { GameTeam } from "../domain/team/game-team.entity";
import { ReportableMessage } from "../multiplayer/reporting/reportable-message";

export class DiscordMessage extends ReportableMessage {
  public embeds: RichEmbed[];
  public discordMessageSent?: Message;

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

    for (let messageReportables of vmGroupedReportables) {
      const newEmbed = new RichEmbed();

      // we want the messages displayed before the game events
      messageReportables = messageReportables.sort((r1, r2) => {
        if (r1.type === "message" && r2.type === "game_event") return -1;
        else if (r1.type === "game_event" && r2.type === "message") return 1;
        else return 0;
      });

      // add some game info to the Author field
      for (const reportable of messageReportables) {
        if (reportable.type === "game_event") {
          const gameEvent = reportable.item as IGameEvent;
          const game = gameEvent?.data?.game;
          if (!game) {
            Log.warn(`No game on GameEvent data. We'll check the next one...`);
          } else {
            // TODO - Get the true virtual match number - the below code is temporary - it may be inaccurate for multi-lobby games
            const mapNumber = gameEvent.data.eventMatch.matches.length ? gameEvent.data.eventMatch.matches[0].mapNumber : 0;
            this.addGameInfoAuthorField(game, newEmbed, mapNumber);
            break;
          }
        }
      }

      // add beatmap title header to message if it contains a leaderboard
      for (const reportable of messageReportables) {
        if (reportable.type === "leaderboard") {
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

  addGameInfoAuthorField(game: Game, targetEmbed: RichEmbed, mapNumber: number): void {
    let authorString = `Battle Royale ${game.id}`;
    if (mapNumber > 0) {
      authorString = authorString.concat(` - Result #${mapNumber}`);
    }
    // TODO - add map duration
    // TODO - add map number
    // TODO - add estimated maps remaining (from maps played / total lives - 1)
    // const now = Date.now();
    // if (game.startedAt && now > game.startedAt) {
    //   const duration = Helpers.getDurationBetweenTimesAsHHMMSS(now, game.startedAt);
    //   authorString += ` - ${duration}`;
    // }
    const osuLogoUrl = "https://i.imgur.com/6qZ48Zr.png";
    if (!game?.gameLobbies.length) {
      targetEmbed.setAuthor(authorString, osuLogoUrl);
      return;
    }
    // TODO - handle situations for multi-lobby games - right now we only link to the first lobby MP link
    const banchoLobbyId = game.gameLobbies[0].lobby?.banchoMultiplayerId;
    const osuMultiUrl = banchoLobbyId ? `https://osu.ppy.sh/community/matches/${banchoLobbyId}` : null;
    targetEmbed.setAuthor(authorString, osuLogoUrl, osuMultiUrl);
  }

  addBeatmapTitle(beatmapPlayed: Beatmap, targetEmbed: RichEmbed): void {
    const b = beatmapPlayed;
    const mapString = `${b.artist} - ${b.title} [${b.diffName}] (${Number(b.stars).toFixed(2)}⭐)`; // TODO: Add mods used
    targetEmbed.setTitle(mapString);
    targetEmbed.setURL(beatmapPlayed.beatmapUrl);
    targetEmbed.setThumbnail(beatmapPlayed.backgroundThumbnailUrlLarge);
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
    let messageValue = "";
    let icon = "";
    if (r.type === "all_lobbies_completed") {
      icon = `✅`;
    } else if (r.type === "lobby_awaiting") {
      icon = `⌛`;
    } else if (r.type === "lobby_completed") {
      icon = `🦞`;
    } else if (r.type === "match_aborted") {
      icon = `🛑`;
    } else {
      const _exhaustiveCheck: never = r.type;
      return _exhaustiveCheck;
    }

    messageValue = `${icon} ${r.message} ${Helpers.getTimeAgoTextForTime(r.time)}.`;
    targetEmbed.addField("\u200b", messageValue);
  }

  private addGameEventPart(reportable: ReportableContext<ReportableContextType>, targetEmbed: RichEmbed): void {
    const gameEvent = reportable.item as IGameEvent;
    const gameTeams = gameEvent.data.game.gameTeams;
    const gameTeam: GameTeam = gameTeams.find(gameTeam => gameEvent.data.team && gameTeam.team.id === gameEvent.data.team.id);
    const eventTeamNumber: string = gameTeam ? gameTeam.teamNumber.toString() : "unknown";

    let messageValue = "";
    let icon = "";
    // TODO - replace all this stuff below with getting emoji from GameEventTypeDataMapper
    if (gameEvent.type === "team_eliminated") {
      // const ge = gameEvent as TeamEliminatedGameEvent;
      icon = `💀`;
      messageValue = messageValue.concat(`Team ${eventTeamNumber} was eliminated!`); // TODO: Team number with player names
    } else if (gameEvent.type === "team_game_champion_declared") {
      icon = `🏆`;
      // const ge = gameEvent as TeamIsGameChampionGameEvent;
      messageValue = `Game over! The winner is Team ${eventTeamNumber}!`;
    } else if (gameEvent.type === "team_on_winning_streak") {
      // messageValue = messageValue.concat(`🌟`, ` `, `Team is on a winning streak!`); // TODO
      return;
    } else if (gameEvent.type === "team_scored_highest") {
      icon = `⭐`;
      // const ge = gameEvent as TeamScoredHighestGameEvent;
      messageValue = `Team ${eventTeamNumber} won the match!`;
    } else if (gameEvent.type === "team_scored_lowest") {
      icon = `💥`;
      // const ge = gameEvent as TeamScoredLowestGameEvent;
      messageValue = `Team ${eventTeamNumber} lost a life!`;
    } else if (gameEvent.type === "team_scores_submitted") {
      // icon = ``;
      // const ge = gameEvent as TeamScoresSubmittedGameEvent;
      // messageValue = messageValue.concat(`  `, ` `, `Teams submitted scores.`); // TODO
      return;
    } else if (gameEvent.type === "team_scores_tied") {
      icon = `👔`;
      // TODO - tied scores - idk if the code below works (e.g. undefined objects) - write a test before using this in production!!
      // const ge = gameEvent as TeamScoresTiedGameEvent;
      // const teamTied = Array.from(ge.data.data).map(a => {
      //   const teamId = a[0];
      //   const tiedTeamsData = a[1];
      //   return {
      //     teamNumber: gameTeams.find(gt => gt.team.id === teamId),
      //     tiedWithTeamNumbers: tiedTeamsData.tiedWithTeamIds.map(teamId => gameTeams.find(gt => gt.team.id === teamId).teamNumber)
      //   };
      // });
      messageValue = `Some teams had tied scores.`;
    } else {
      const _exhaustiveCheck: never = gameEvent.type;
      return _exhaustiveCheck;
    }

    // const team = _(gameEvent.data.eventMatch.matches)
    //   .map(m => {
    //     return m.playerScores.map(ps => {
    //       const teamOsuUser = ps.scoredBy.teamOsuUsers.find(tou => tou.team.id === gameEvent.data.teamId);
    //       if (teamOsuUser) {
    //         return teamOsuUser.team;
    //       }
    //     });
    //   })
    //   .flatten()
    //   .first();

    targetEmbed.addField("\u200b", `${icon} ${messageValue}`);
  }
}
