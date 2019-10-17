import { context } from "./spreadsheet-context";

const processedLobby1ApiResults1 = [
  {
    beatmapId: "BM1",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [{ banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId }],
      remaining: [{ banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM2",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [{ banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId }],
      remaining: [{ banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM3",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [{ banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId }],
      remaining: [{ banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }],
      greatestPlayedCount: 2
    }
  },
  {
    beatmapId: "BM4",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [{ banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId }],
      remaining: [{ banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM3",
    sameBeatmapNumber: 2,
    lobbies: {
      played: [{ banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId }],
      remaining: [{ banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }],
      greatestPlayedCount: 2
    }
  }
];

const processedLobby2ApiResults1 = [
  {
    beatmapId: "BM1",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM2",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM3",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [{ banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId }],
      remaining: [{ banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }],
      greatestPlayedCount: 2
    }
  },
  {
    beatmapId: "BM4",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM3",
    sameBeatmapNumber: 2,
    lobbies: {
      played: [{ banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId }],
      remaining: [{ banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }],
      greatestPlayedCount: 2
    }
  },
  {
    beatmapId: "BM5",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [{ banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }],
      remaining: [{ banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId }],
      greatestPlayedCount: 1
    }
  }
];

const processedLobby2ApiResults2 = [
  {
    beatmapId: "BM1",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM2",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM3",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 2
    }
  },
  {
    beatmapId: "BM4",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM3",
    sameBeatmapNumber: 2,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 2
    }
  },
  {
    beatmapId: "BM5",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [{ banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }],
      remaining: [{ banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId }],
      greatestPlayedCount: 1
    }
  }
];

const processedLobby1ApiResults2 = [
  {
    beatmapId: "BM1",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM2",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM3",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 2
    }
  },
  {
    beatmapId: "BM4",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM3",
    sameBeatmapNumber: 2,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 2
    }
  },
  {
    beatmapId: "BM5",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 1
    }
  }
];

const processedLobby2ApiResults3 = [
  {
    beatmapId: "BM1",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM2",
    sameBeatmapNumber: 1,

    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM3",
    sameBeatmapNumber: 1,

    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 2
    }
  },
  {
    beatmapId: "BM4",
    sameBeatmapNumber: 1,

    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM3",
    sameBeatmapNumber: 2,

    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 2
    }
  },
  {
    beatmapId: "BM5",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 2
    }
  },
  {
    beatmapId: "BM5",
    sameBeatmapNumber: 2,
    lobbies: {
      played: [{ banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }],
      remaining: [{ banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId }],
      greatestPlayedCount: 2
    }
  }
];

const processedLobby1ApiResults3 = [
  {
    beatmapId: "BM1",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM2",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM3",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 2
    }
  },
  {
    beatmapId: "BM4",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM3",
    sameBeatmapNumber: 2,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 2
    }
  },
  {
    beatmapId: "BM5",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 2
    }
  },
  {
    beatmapId: "BM5",
    sameBeatmapNumber: 2,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 2
    }
  }
];

const processedLobby2ApiResults4 = [
  {
    beatmapId: "BM1",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM2",
    sameBeatmapNumber: 1,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM3",
    sameBeatmapNumber: 1,

    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 2
    }
  },
  {
    beatmapId: "BM4",
    sameBeatmapNumber: 1,

    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 1
    }
  },
  {
    beatmapId: "BM3",
    sameBeatmapNumber: 2,

    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 2
    }
  },
  {
    beatmapId: "BM5",
    sameBeatmapNumber: 1,

    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 3
    }
  },
  {
    beatmapId: "BM5",
    sameBeatmapNumber: 2,
    lobbies: {
      played: [
        { banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId },
        { banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }
      ],
      remaining: [],
      greatestPlayedCount: 3
    }
  },
  {
    beatmapId: "BM5",
    sameBeatmapNumber: 3,
    lobbies: {
      played: [{ banchoMultiplayerId: context.requests.addLobby2Request.banchoMultiplayerId }],
      remaining: [{ banchoMultiplayerId: context.requests.addLobby1Request.banchoMultiplayerId }],
      greatestPlayedCount: 3
    }
  }
];

export const processedState = {
  lobby1ApiResults1: processedLobby1ApiResults1,
  lobby2ApiResults1: processedLobby2ApiResults1,
  lobby2ApiResults2: processedLobby2ApiResults2,
  lobby1ApiResults2: processedLobby1ApiResults2,
  lobby2ApiResults3: processedLobby2ApiResults3,
  lobby1ApiResults3: processedLobby1ApiResults3,
  lobby2ApiResults4: processedLobby2ApiResults4
};
