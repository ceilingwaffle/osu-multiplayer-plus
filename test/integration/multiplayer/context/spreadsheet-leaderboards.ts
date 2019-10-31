import { Leaderboard } from "../../../../src/multiplayer/components/leaderboard";
import { context } from "./spreadsheet-context";

const leaderboard_bm2_1: Leaderboard = {
  beatmapPlayed: { mapId: null, mapUrl: null, mapString: null, stars: null },
  beatmapId: "BM2",
  sameBeatmapNumber: 1,
  leaderboardLines: [
    {
      team: {
        teamName: null, // TODO
        teamNumber: 1,
        players: [] // TODO LeaderboardLinePlayer[]
      },
      alive: true,
      position: {
        currentPosition: 0
      },
      eventIcon: {
        eventEmoji: "", // TODO
        eventType: "team_scored_highest",
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: context.requests.createGameRequest1.teamLives,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 400
      }
    },
    {
      team: {
        teamName: null, // TODO
        teamNumber: 2,
        players: [] // TODO LeaderboardLinePlayer[]
      },
      alive: true,
      position: {
        currentPosition: 1
      },
      eventIcon: undefined,
      lives: {
        currentLives: context.requests.createGameRequest1.teamLives,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 300
      }
    },
    {
      team: {
        teamName: null, // TODO
        teamNumber: 3,
        players: [] // TODO LeaderboardLinePlayer[]
      },
      alive: true,
      position: {
        currentPosition: 2
      },
      eventIcon: undefined,
      lives: {
        currentLives: context.requests.createGameRequest1.teamLives,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 200
      }
    },
    {
      team: {
        teamName: null, // TODO
        teamNumber: 4,
        players: [] // TODO LeaderboardLinePlayer[]
      },
      alive: true,
      position: {
        currentPosition: 3
      },
      eventIcon: {
        eventEmoji: "", // TODO
        eventType: "team_scored_lowest",
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: context.requests.createGameRequest1.teamLives,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 100
      }
    }
  ]
};

const leaderboard_bm4_1: Leaderboard = {
  beatmapPlayed: { mapId: null, mapUrl: null, mapString: null, stars: null },
  beatmapId: "BM4",
  sameBeatmapNumber: 1,
  leaderboardLines: [
    {
      team: {
        teamName: null, // TODO
        teamNumber: 1,
        players: [] // TODO LeaderboardLinePlayer[]
      },
      alive: false,
      position: {
        currentPosition: 3,
        previousPosition: 2,
        change: "lost"
      },
      eventIcon: {
        eventEmoji: "", // TODO
        eventType: "team_eliminated",
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: 0,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 100
      }
    },
    {
      team: {
        teamName: null, // TODO
        teamNumber: 2,
        players: [] // TODO LeaderboardLinePlayer[]
      },
      alive: true,
      position: {
        currentPosition: 0,
        previousPosition: 0,
        change: "same"
      },
      eventIcon: {
        eventEmoji: "", // TODO
        eventType: undefined,
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: 2,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 300
      }
    },
    {
      team: {
        teamName: null, // TODO
        teamNumber: 3,
        players: [] // TODO LeaderboardLinePlayer[]
      },
      alive: true,
      position: {
        currentPosition: 1,
        previousPosition: 0,
        change: "lost"
      },
      eventIcon: {
        eventEmoji: "", // TODO
        eventType: undefined,
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: 2,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 200
      }
    },
    {
      team: {
        teamName: null, // TODO
        teamNumber: 4,
        players: [] // TODO LeaderboardLinePlayer[]
      },
      alive: true,
      position: {
        currentPosition: 2,
        previousPosition: 2,
        change: "same"
      },
      eventIcon: {
        eventEmoji: "", // TODO
        eventType: "team_scored_highest",
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: 1,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 400
      }
    }
  ]
};

export const expectedLeaderboards = {
  //   bm2_1: leaderboard_bm2_1,
  //   bm1_1: leaderboard_bm1_1,
  bm4_1: leaderboard_bm4_1
};