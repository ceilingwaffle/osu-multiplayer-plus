import { LeaderboardLine } from "../components/leaderboard-line";
import { Leaderboard } from "../components/leaderboard";

export class DiscordLeaderboardMessageBuilder {
  static build(leaderboardData: Leaderboard): string {
    const leaderboardOutput = `\`\`\`
  Played: 
    ${leaderboardData.beatmapPlayed.title} (${leaderboardData.beatmapPlayed.stars}⭐}) (#1) 
  
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
  ${this.genLifeHearts(ll)} | \
  Score: ${ll.teamScore.teamScore} | \ 
  ${ll.team.players
    .map(p => `${p.osuUsername}: ${p.score.highestScoreInTeam ? `*${p.score.score}*` : `${p.score.score}`} [${p.score.scoreLetterGrade}]`)
    .join(", ")}
  `;
  }

  private static genLifeHearts(ll: LeaderboardLine) {
    return `${"🤎".repeat(ll.lives.currentLives)}${"🤍".repeat(ll.lives.startingLives - ll.lives.currentLives)}`;
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
