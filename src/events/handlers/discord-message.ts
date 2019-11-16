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
import { LeaderboardLine } from "../../multiplayer/components/leaderboard-line";
import { Leaderboard } from "../../multiplayer/components/leaderboard";
import { MessageType } from "../../multiplayer/messages/types/message-type";

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

class DiscordLeaderboardMessageBuilder {
  static build(leaderboardData: Leaderboard): string {
    const leaderboardOutput = `\`\`\`
  Played: 
     ${leaderboardData.beatmapPlayed.mapString} (${leaderboardData.beatmapPlayed.stars}⭐}) (#1) 
  
  ${leaderboardData.leaderboardLines.find(ll => ll.alive) ? "Alive\n" : ""} \
  ${leaderboardData.leaderboardLines
    .filter(ll => ll.alive)
    .map((ll, i, lines) => this.genLeaderboardLines(ll, lines))
    .join("\n")}
  ${leaderboardData.leaderboardLines.find(ll => !ll.alive) ? "Eliminated\n" : ""} \
  ${leaderboardData.leaderboardLines
    .filter(ll => !ll.alive)
    .map((ll, i, lines) => this.genLeaderboardLines(ll, lines))
    .join("\n")}
  \`\`\``;

    return leaderboardOutput;
  }

  private static genLeaderboardLines(ll: LeaderboardLine, lines: LeaderboardLine[]): string {
    // TODO: Check for tied scores // ${ll.teamScore.tiedWithTeamNumbers.length ? "👔" : ""}

    return `\
  ${this.genPositionChange(ll)} ${this.genPosition(ll, lines)}. Team ${this.genTeamNumber(ll, lines)} \
  |${ll.eventIcon ? ll.eventIcon.eventEmoji : "⬛"}| \
  ${"🤎".repeat(ll.lives.currentLives)}${"🤍".repeat(ll.lives.startingLives - ll.lives.currentLives)} | \
  Score: ${ll.teamScore.teamScore} | \ 
  ${ll.team.players
    .map(p => `${p.osuUsername}: ${p.score.highestScoreInTeam ? `*${p.score.score}*` : `${p.score.score}`} [${p.score.scoreLetterGrade}]`)
    .join(", ")}
  `;
  }

  private static genPositionChange(ll: LeaderboardLine): string {
    return `${
      ll.position.currentPosition > ll.position.previousPosition
        ? "⬆"
        : ll.position.currentPosition === ll.position.previousPosition
        ? " "
        : "⬇"
    }`;
  }

  private static genPosition(ll: LeaderboardLine, allLines: LeaderboardLine[]): string {
    const digits = allLines.length.toString().length;
    return ll.position.currentPosition.toString().padStart(digits, "0");
  }

  private static genTeamNumber(ll: LeaderboardLine, allLines: LeaderboardLine[]): string {
    // We want to format the team number such that the number with fewer digits are left-padded with "0", but only if the total number of digits is greater than 1.
    // e.g. If there are 2 teams: "team 1, team 2". If there are 11 teams: "...team 09, team 10, team 11".
    const digits = allLines.length.toString().length;
    return ll.team.teamNumber.toString().padStart(digits, "0");
  }
}
