import { LeaderboardLine } from "./leaderboard-line";
import { ScoringType } from "../components/enums/scoring-type";
import { Leaderboard } from "./leaderboard";
import { PlayMode } from "../components/enums/play-mode";
import { MultiTeamType } from "nodesu";
import { Mods } from "../components/enums/mods";

// const spendingTemplate = fs.readFileSync("templates/spending.mustache", "utf8");
// const spendingData = {
//   title: "Joe",
//   calc: function() {
//     return 2 + 4;
//   }
// };
// const spendingOutput = Mustache.render(spendingTemplate, spendingData);
// console.log(spendingOutput);

// https://i.imgur.com/EubsZyK.png
// const leaderboardTemplate = fs.readFileSync("templates/leaderboard.mustache", "utf8").trim();
var leaderboardData: Leaderboard = {
  beatmapId: "1234",
  sameBeatmapNumber: 1,
  beatmapsRemaining: 4,
  beatmapPlayed: {
    stars: 5,
    mapString: "Galneryus - Raise My Sword [AAAAAAA]",
    mapId: "1234",
    mapUrl: "https://osu.ppy.sh/b/1234"
  },
  lobby: {
    banchoLobbyId: "12345678",
    scoreType: ScoringType.scoreV2,
    lobbyName: "My Cool Lobby Name",
    resultsUrl: "https://osu.ppy.sh/mp/12345678"
  },
  match: {
    startTime: 1,
    endTime: 1,
    playMode: PlayMode.Standard,
    scoringType: ScoringType.scoreV2,
    teamType: MultiTeamType.headToHead,
    forcedMods: Mods.None,
    beatmap: {
      stars: 5,
      mapString: "Galneryus - Raise My Sword [AAAAAAA]",
      mapId: "1234",
      mapUrl: "https://osu.ppy.sh/b/1234"
    },
    status: "completed",
    entityId: 1
  },
  // events: [
  //   {
  //     eventEmoji: "⭐",
  //     eventType: "team_won",
  //     eventDescription: "Team X won the match!"
  //   },
  //   {
  //     eventEmoji: "💥",
  //     eventType: "team_lost",
  //     eventDescription: "Team Y lost a life!"
  //   },
  //   {
  //     eventEmoji: "💀",
  //     eventType: "team_eliminated",
  //     eventDescription: "Team Y lost all their lives and was eliminated!"
  //   }
  // ],
  leaderboardLines: [
    {
      team: {
        teamName: "Team X",
        teamNumber: 1,
        players: [
          {
            osuUsername: "TXP1",
            scoreSubmitted: true,
            score: {
              score: 110000,
              rankAchieved: "B",
              accuracy: 93.0,
              highestScoreInTeam: true
            }
          },
          {
            osuUsername: "TXP2",
            scoreSubmitted: true,
            score: {
              score: 90000,
              rankAchieved: "C",
              accuracy: 81.0,
              highestScoreInTeam: false
            }
          }
        ]
      },
      alive: true,
      position: {
        currentPosition: 1,
        previousPosition: 1,
        samePosition: true,
        gainedPosition: false,
        lostPosition: false
      },
      event: {
        eventEmoji: "⭐",
        eventType: "team_won_match",
        eventDescription: "Team X won the match!"
      },
      lives: {
        currentLives: 1,
        startingLives: 2
      },
      teamScore: {
        teamScore: 200000,
        tiedWithTeamNumbers: []
      }
    },
    {
      team: {
        teamName: "Team Y",
        teamNumber: 2,
        players: [
          {
            osuUsername: "TYP3",
            scoreSubmitted: true,
            score: {
              score: 40000,
              rankAchieved: "C",
              accuracy: 86.5,
              highestScoreInTeam: true
            }
          },
          {
            osuUsername: "TYP4",
            scoreSubmitted: true,
            score: {
              score: 0,
              rankAchieved: "F",
              accuracy: 0.0,
              highestScoreInTeam: false
            }
          }
        ]
      },
      alive: false,
      position: {
        currentPosition: 2,
        previousPosition: 2,
        samePosition: true,
        gainedPosition: false,
        lostPosition: false
      },
      event: {
        eventEmoji: "💀",
        eventType: "team_eliminated",
        eventDescription: "Team Y lost all their lives and was eliminated!"
      },
      lives: {
        currentLives: 0,
        startingLives: 2
      },
      teamScore: {
        teamScore: 40000,
        tiedWithTeamNumbers: []
      }
    }
  ]
};

// const leaderboardOutput = Mustache.render(leaderboardTemplate, leaderboardData);
const leaderboardOutput = `\`\`\`
  Played: 
     ${leaderboardData.beatmapPlayed.mapString} (${leaderboardData.beatmapPlayed.stars}⭐}) (#1) 
  
  ${leaderboardData.leaderboardLines.find(ll => ll.alive) ? "Alive\n" : ""} \
  ${leaderboardData.leaderboardLines
    .filter(ll => ll.alive)
    .map((ll, i, lines) => genLeaderboardLines(ll, lines))
    .join("\n")}
  ${leaderboardData.leaderboardLines.find(ll => !ll.alive) ? "Eliminated\n" : ""} \
  ${leaderboardData.leaderboardLines
    .filter(ll => !ll.alive)
    .map((ll, i, lines) => genLeaderboardLines(ll, lines))
    .join("\n")}
  \`\`\``;
console.log(leaderboardOutput);

function genLeaderboardLines(ll: LeaderboardLine, lines: LeaderboardLine[]): string {
  return `\
  ${genPositionChange(ll)} ${genPosition(ll, lines)}. Team ${genTeamNumber(ll, lines)} \
  |${ll.event ? ll.event.eventEmoji : "⬛"}| \
  ${"🤎".repeat(ll.lives.currentLives)}${"🤍".repeat(ll.lives.startingLives - ll.lives.currentLives)} | \
  Score: ${ll.teamScore.teamScore}${ll.teamScore.tiedWithTeamNumbers.length ? "👔" : ""} | \
  ${ll.team.players
    .map(p => `${p.osuUsername}: ${p.score.highestScoreInTeam ? `*${p.score.score}*` : `${p.score.score}`} [${p.score.rankAchieved}]`)
    .join(", ")}
  `;
}

function genPositionChange(ll: LeaderboardLine): string {
  return `${
    ll.position.currentPosition > ll.position.previousPosition
      ? "⬆"
      : ll.position.currentPosition === ll.position.previousPosition
      ? " "
      : "⬇"
  }`;
}

function genPosition(ll: LeaderboardLine, allLines: LeaderboardLine[]): string {
  const digits = allLines.length.toString().length;
  return ll.position.currentPosition.toString().padStart(digits, "0");
}

function genTeamNumber(ll: LeaderboardLine, allLines: LeaderboardLine[]): string {
  // We want to format the team number such that the number with fewer digits are left-padded with "0", but only if the total number of digits is greater than 1.
  // e.g. If there are 2 teams: "team 1, team 2". If there are 11 teams: "...team 09, team 10, team 11".
  const digits = allLines.length.toString().length;
  return ll.team.teamNumber.toString().padStart(digits, "0");
}
