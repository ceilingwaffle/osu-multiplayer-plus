import { Leaderboard } from "../components/leaderboard";
import { Beatmap } from "../components/beatmap";
import * as Mustache from "mustache"; // do not convert to default import !!
import * as puppeteer from "puppeteer";
import * as fs from "fs-extra";
import { Log } from "../../utils/Log";
import { LeaderboardLine } from "../components/leaderboard-line";
import { Helpers } from "../../utils/helpers";
import * as path from "path";

type PositionChangeTypes = "⬆" | "⬇" | " ";

interface ImgLeaderboard {
  beatmap: Beatmap;
  lines: {
    alive: ImgLeaderboardLine[];
    eliminated: ImgLeaderboardLine[];
  };
}

interface ImgLeaderboardLine {
  positionChange: PositionChangeTypes;
  positionNumber: string;
  teamNumberString: string;
  eventEmoji?: string; // TODO: replace "string" with union type like "🌟"|"💀"
  lifeHearts: string;
  score: string;
  scoreTied?: "👔";
  playerStats: ImgPlayerStats[];
}

interface ImgPlayerStats {
  name: string;
  osuUserId: string;
  // optional because a player could potentially not submit a score
  score?: string;
  scoreRankAchieved?: string;
}

export class DiscordLeaderboardImageBuilder {
  /**
   * Builds an image from leaderboard data.
   *
   * @param {ImgLeaderboard} data
   * @returns {Promise<string>} Base64 string of the generated image.
   * @memberof DiscordLeaderboardImageBuilder
   */
  static async build(data: ImgLeaderboard): Promise<string> {
    // TODO: Check if DiscordJS lets us attach some Base64 data for an image
    // see - https://github.com/discordjs/discord.js/issues/2175#issuecomment-538948474

    const config = {
      files: {
        templates: {
          leaderboard: path.resolve(__dirname, "./templates/leaderboard.mustache"),
          partials: {
            leaderboardLine: path.resolve(__dirname, "./templates/partials/leaderboard-line.mustache"),
            stylesheet: path.resolve(__dirname, "./templates/assets/css/stylesheet.css")
          }
        }
      }
    };

    try {
      // render html string from mustache template
      const templateContents = fs.readFileSync(config.files.templates.leaderboard, "utf8");
      const htmlString = Mustache.render(templateContents, data, {
        leaderboardLine: fs.readFileSync(config.files.templates.partials.leaderboardLine, "utf8"),
        stylesheet: fs.readFileSync(config.files.templates.partials.stylesheet, "utf8")
      });

      Log.info(htmlString);

      // render image using puppeteer
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setContent(htmlString);
      // Using viewport width=1 and height=1 as a hacky way to only return the contents of the page (without the surrounding whitespace) - works only when combined with fullpage:true
      await page.setViewport({ width: 1, height: 1 });
      // NOTE: the width of the image is equal to the CSS .html width + all the other .html CSS elements (like border, padding (L,R) etc.)
      const b64imgString = await page.screenshot({ encoding: "base64", fullPage: true });
      await browser.close();
      return b64imgString;
    } catch (error) {
      Log.error(error);
      throw error;
    }
  }

  static buildImageDataObjectFromLeaderboard(leaderboard: Leaderboard): ImgLeaderboard {
    return {
      beatmap: leaderboard.beatmapPlayed,
      lines: {
        alive: leaderboard.leaderboardLines
          .filter(ll => ll.lives.currentLives > 0)
          .map(ll => DiscordLeaderboardImageBuilder.genLeaderboardLineData(ll, leaderboard.leaderboardLines)),
        eliminated: leaderboard.leaderboardLines
          .filter(ll => ll.lives.currentLives < 1)
          .map(ll => DiscordLeaderboardImageBuilder.genLeaderboardLineData(ll, leaderboard.leaderboardLines))
      }
    };
  }

  private static genLeaderboardLineData(ll: LeaderboardLine, allLines: LeaderboardLine[]): ImgLeaderboardLine {
    return {
      positionChange: DiscordLeaderboardImageBuilder.genPositionChange(ll),
      positionNumber: `${DiscordLeaderboardImageBuilder.genCurrentPositionString(ll, allLines)}.`,
      teamNumberString: `Team ${DiscordLeaderboardImageBuilder.genTeamNumber(ll, allLines)}`,
      eventEmoji: ll.eventIcon?.eventEmoji,
      lifeHearts: DiscordLeaderboardImageBuilder.genLifeHearts(ll),
      score: Helpers.numberWithCommas(ll.teamScore.teamScore),
      // scoreTied: ll.teamScore, // TODO
      playerStats: ll.team.players.map<ImgPlayerStats>(player => ({
        name: player.osuUsername,
        osuUserId: player.osuUserId,
        score: Helpers.numberWithCommas(player.score.score)
        // scoreRankAchieved?: string; // TODO
      }))
    };
  }

  // TODO: Move these methods - genPositionChange, genPosition, genTeamNumber into a Helper class to avoid DRY with DiscordLeaderboardMessageBuilder
  private static genPositionChange(ll: LeaderboardLine): PositionChangeTypes {
    return ll.position.currentPosition > ll.position.previousPosition
      ? "⬆"
      : ll.position.currentPosition === ll.position.previousPosition
      ? " "
      : "⬇";
  }

  private static genLifeHearts(ll: LeaderboardLine) {
    return `${"🤎".repeat(ll.lives.currentLives)}${"🤍".repeat(ll.lives.startingLives - ll.lives.currentLives)}`;
  }

  private static genCurrentPositionString(ll: LeaderboardLine, allLines: LeaderboardLine[]): string {
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
