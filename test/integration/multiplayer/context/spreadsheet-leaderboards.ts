import { Leaderboard } from "../../../../src/multiplayer/components/leaderboard";
import { context } from "./spreadsheet-context";
import { VirtualMatchCreator } from "../../../../src/multiplayer/virtual-match/virtual-match-creator";
import { TestHelpers } from "../../../test-helpers";

const leaderboard_bm2_1: Leaderboard = {
  leaderboardEventTime: TestHelpers.getTimeOfApiResultsMapPlayed({
    resultsContainingMap: context.osuApiResults.lobby1ApiResults1,
    lobbyPlayedMapOrderNumber: 2
  }),
  beatmapPlayed: {
    // mapString: null,
    beatmapId: null,
    beatmapSetId: null,
    beatmapUrl: null,
    stars: null,
    title: null,
    artist: null,
    diffName: null,
    backgroundThumbnailUrlLarge: null,
    backgroundThumbnailUrlSmall: null
  },
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
        currentLives: 1,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 100
      }
    }
  ]
};

const leaderboard_bm1_1: Leaderboard = {
  leaderboardEventTime: TestHelpers.getTimeOfApiResultsMapPlayed({
    resultsContainingMap: context.osuApiResults.lobby1ApiResults1,
    lobbyPlayedMapOrderNumber: 1
  }),
  beatmapPlayed: {
    // mapString: null,
    beatmapId: null,
    beatmapSetId: null,
    beatmapUrl: null,
    diffName: null,
    stars: null,
    title: null,
    artist: null,
    backgroundThumbnailUrlLarge: null,
    backgroundThumbnailUrlSmall: null
  },
  beatmapId: "BM1",
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
        currentPosition: 2,
        previousPosition: 0,
        change: "lost"
      },
      eventIcon: {
        eventEmoji: "", // TODO
        eventType: "team_scored_lowest",
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: 1,
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
        previousPosition: 1,
        change: "gained"
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
        teamNumber: 3,
        players: [] // TODO LeaderboardLinePlayer[]
      },
      alive: true,
      position: {
        currentPosition: 0,
        previousPosition: 2,
        change: "gained"
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
        teamNumber: 4,
        players: [] // TODO LeaderboardLinePlayer[]
      },
      alive: true,
      position: {
        currentPosition: 2,
        previousPosition: 3,
        change: "gained"
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

const leaderboard_bm4_1: Leaderboard = {
  leaderboardEventTime: TestHelpers.getTimeOfApiResultsMapPlayed({
    resultsContainingMap: context.osuApiResults.lobby1ApiResults1,
    lobbyPlayedMapOrderNumber: 4
  }),
  beatmapPlayed: {
    // mapString: null,
    beatmapId: null,
    beatmapSetId: null,
    beatmapUrl: null,
    diffName: null,
    stars: null,
    title: null,
    artist: null,
    backgroundThumbnailUrlLarge: null,
    backgroundThumbnailUrlSmall: null
  },
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

const leaderboard_bm3_2: Leaderboard = {
  leaderboardEventTime: TestHelpers.getTimeOfApiResultsMapPlayed({
    resultsContainingMap: context.osuApiResults.lobby2ApiResults2,
    lobbyPlayedMapOrderNumber: 6
  }),
  beatmapPlayed: {
    // mapString: null,
    beatmapId: null,
    beatmapSetId: null,
    beatmapUrl: null,
    diffName: null,
    stars: null,
    title: null,
    artist: null,
    backgroundThumbnailUrlLarge: null,
    backgroundThumbnailUrlSmall: null
  },
  beatmapId: "BM3",
  sameBeatmapNumber: 2,
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
        previousPosition: 3,
        change: "same"
      },
      eventIcon: {
        eventEmoji: "", // TODO
        eventType: undefined,
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: 0,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 0
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
        eventType: "team_scored_highest",
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: 2,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 600
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
        previousPosition: 1,
        change: "same"
      },
      eventIcon: {
        eventEmoji: "", // TODO
        eventType: "team_scored_lowest",
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: 1,
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
      alive: false,
      position: {
        currentPosition: 2,
        previousPosition: 2,
        change: "same"
      },
      eventIcon: {
        eventEmoji: "", // TODO
        eventType: undefined,
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: 0,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 300
      }
    }
  ]
};

const leaderboard_bm5_1: Leaderboard = {
  leaderboardEventTime: TestHelpers.getTimeOfApiResultsMapPlayed({
    resultsContainingMap: context.osuApiResults.lobby1ApiResults2,
    lobbyPlayedMapOrderNumber: 6
  }),
  beatmapPlayed: {
    // mapString: null,
    beatmapId: null,
    beatmapSetId: null,
    beatmapUrl: null,
    diffName: null,
    stars: null,
    title: null,
    artist: null,
    backgroundThumbnailUrlLarge: null,
    backgroundThumbnailUrlSmall: null
  },
  beatmapId: "BM5",
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
        previousPosition: 3,
        change: "same"
      },
      eventIcon: {
        eventEmoji: "", // TODO
        eventType: undefined,
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: 0,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 300
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
        eventType: "team_scored_lowest",
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: 1,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 100
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
        previousPosition: 1,
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
        teamScore: 200
      }
    },
    {
      team: {
        teamName: null, // TODO
        teamNumber: 4,
        players: [] // TODO LeaderboardLinePlayer[]
      },
      alive: false,
      position: {
        currentPosition: 2,
        previousPosition: 2,
        change: "same"
      },
      eventIcon: {
        eventEmoji: "", // TODO
        eventType: undefined,
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: 0,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 200
      }
    }
  ]
};

const leaderboard_bm5_2: Leaderboard = {
  leaderboardEventTime: TestHelpers.getTimeOfApiResultsMapPlayed({
    resultsContainingMap: context.osuApiResults.lobby1ApiResults3,
    lobbyPlayedMapOrderNumber: 7
  }),
  beatmapPlayed: {
    // mapString: null,
    beatmapId: null,
    beatmapSetId: null,
    beatmapUrl: null,
    diffName: null,
    stars: null,
    title: null,
    artist: null,
    backgroundThumbnailUrlLarge: null,
    backgroundThumbnailUrlSmall: null
  },
  beatmapId: "BM5",
  sameBeatmapNumber: 2,
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
        previousPosition: 3,
        change: "same"
      },
      eventIcon: {
        eventEmoji: "", // TODO
        eventType: undefined,
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: 0,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 0
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
        eventType: "team_scores_tied",
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: 1,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 100
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
        previousPosition: 1,
        change: "same"
      },
      eventIcon: {
        eventEmoji: "", // TODO
        eventType: "team_scores_tied",
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: 1,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 100
      }
    },
    {
      team: {
        teamName: null, // TODO
        teamNumber: 4,
        players: [] // TODO LeaderboardLinePlayer[]
      },
      alive: false,
      position: {
        currentPosition: 2,
        previousPosition: 2,
        change: "same"
      },
      eventIcon: {
        eventEmoji: "", // TODO
        eventType: undefined,
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: 0,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 0
      }
    }
  ]
};

const leaderboard_bm5_3: Leaderboard = {
  leaderboardEventTime: TestHelpers.getTimeOfApiResultsMapPlayed({
    resultsContainingMap: context.osuApiResults.lobby1ApiResults4,
    lobbyPlayedMapOrderNumber: 8
  }),
  beatmapPlayed: {
    // mapString: null,
    beatmapId: null,
    beatmapSetId: null,
    beatmapUrl: null,
    diffName: null,
    stars: null,
    title: null,
    artist: null,
    backgroundThumbnailUrlLarge: null,
    backgroundThumbnailUrlSmall: null
  },
  beatmapId: "BM5",
  sameBeatmapNumber: 3,
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
        previousPosition: 3,
        change: "same"
      },
      eventIcon: {
        eventEmoji: "", // TODO
        eventType: undefined,
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: 0,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 0
      }
    },
    {
      team: {
        teamName: null, // TODO
        teamNumber: 2,
        players: [] // TODO LeaderboardLinePlayer[]
      },
      alive: false,
      position: {
        currentPosition: 1,
        previousPosition: 0,
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
        teamScore: 200
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
        currentPosition: 0,
        previousPosition: 1,
        change: "gained"
      },
      eventIcon: {
        eventEmoji: "", // TODO
        eventType: "team_scored_highest", // TODO - game this to team_is_game_champion event or w/e
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: 1,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 800
      }
    },
    {
      team: {
        teamName: null, // TODO
        teamNumber: 4,
        players: [] // TODO LeaderboardLinePlayer[]
      },
      alive: false,
      position: {
        currentPosition: 2,
        previousPosition: 2,
        change: "same"
      },
      eventIcon: {
        eventEmoji: "", // TODO
        eventType: undefined,
        eventDescription: "" // TODO
      },
      lives: {
        currentLives: 0,
        startingLives: context.requests.createGameRequest1.teamLives
      },
      teamScore: {
        teamScore: 0
      }
    }
  ]
};

export const expectedLeaderboards = {
  bm2_1: leaderboard_bm2_1,
  bm1_1: leaderboard_bm1_1,
  bm4_1: leaderboard_bm4_1,
  bm3_2: leaderboard_bm3_2,
  bm5_1: leaderboard_bm5_1,
  bm5_2: leaderboard_bm5_2,
  bm5_3: leaderboard_bm5_3
};
