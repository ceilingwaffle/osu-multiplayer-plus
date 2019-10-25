import { ApiMultiplayer } from "../../../../src/osu/types/api-multiplayer";
import { TeamMode } from "../../../../src/multiplayer/components/enums/team-mode";
import { FakeOsuApiFetcher } from "../../../classes/fake-osu-api-fetcher";
import { CreateGameDto } from "../../../../src/domain/game/dto/create-game.dto";
import { DiscordRequestDto } from "../../../../src/requests/dto/discord-request.dto";
import { AddLobbyDto } from "../../../../src/domain/lobby/dto/add-lobby.dto";

const values = {
  banchoMultiplayerIds: {
    lobby1: "1234",
    lobby2: "5678"
  },
  teams: {
    _2v2: [["p1", "p2"], ["p3", "p4"]]
  }
};

const requests: {
  discordRequest1: DiscordRequestDto;
  createGameRequest1: CreateGameDto;
  addLobby1Request: AddLobbyDto;
  addLobby2Request: AddLobbyDto;
} = {
  discordRequest1: {
    commType: "discord",
    authorId: "test_user",
    originChannelId: "test_channel_1"
  },
  createGameRequest1: {
    teamLives: 2,
    countFailedScores: "true"
  },
  addLobby1Request: {
    banchoMultiplayerId: values.banchoMultiplayerIds.lobby1
  },
  addLobby2Request: {
    banchoMultiplayerId: values.banchoMultiplayerIds.lobby2
  }
};

const lobby1ApiResults1: ApiMultiplayer = {
  multiplayerId: values.banchoMultiplayerIds.lobby1,
  matches: [
    {
      mapNumber: 1,
      multiplayerId: values.banchoMultiplayerIds.lobby1,
      mapId: "BM1",
      startTime: new Date().getTime() + 1,
      endTime: new Date().getTime() + 301,
      teamMode: TeamMode.HeadToHead,
      event: "match_end",
      scores: [
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[0][0]).toString(),
          score: 100000,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        },
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[1][0]).toString(),
          score: 100001,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        }
      ]
    },
    {
      mapNumber: 2,
      multiplayerId: values.banchoMultiplayerIds.lobby1,
      mapId: "BM2",
      startTime: new Date().getTime() + 12,
      endTime: new Date().getTime() + 312,
      teamMode: TeamMode.HeadToHead,
      event: "match_end",
      scores: [
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[0][0]).toString(),
          score: 100000,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        },
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[0][0]).toString(),
          score: 100001,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        }
      ]
    },
    {
      mapNumber: 3,
      multiplayerId: values.banchoMultiplayerIds.lobby1,
      mapId: "BM3", // BM3#1
      startTime: new Date().getTime() + 33,
      endTime: new Date().getTime() + 333,
      teamMode: TeamMode.HeadToHead,
      event: "match_end",
      scores: [
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[0][0]).toString(),
          score: 100000,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        },
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[0][0]).toString(),
          score: 100001,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        }
      ]
    },
    {
      mapNumber: 4,
      multiplayerId: values.banchoMultiplayerIds.lobby1,
      mapId: "BM4",
      startTime: new Date().getTime() + 44,
      endTime: new Date().getTime() + 344,
      teamMode: TeamMode.HeadToHead,
      event: "match_end",
      scores: [
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[0][0]).toString(),
          score: 100000,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        },
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[0][0]).toString(),
          score: 100001,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        }
      ]
    },
    {
      mapNumber: 5,
      multiplayerId: values.banchoMultiplayerIds.lobby1,
      mapId: "BM3", // BM3#2
      startTime: new Date().getTime() + 55,
      endTime: new Date().getTime() + 355,
      teamMode: TeamMode.HeadToHead,
      event: "match_end",
      scores: [
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[0][0]).toString(),
          score: 100000,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        },
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[1][0]).toString(),
          score: 100001,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        }
      ]
    }
  ]
};

const lobby2ApiResults1: ApiMultiplayer = {
  multiplayerId: requests.addLobby2Request.banchoMultiplayerId,
  matches: [
    {
      mapNumber: 1,
      multiplayerId: requests.addLobby2Request.banchoMultiplayerId,
      mapId: "BM2",
      startTime: new Date().getTime() + 101,
      endTime: new Date().getTime() + 401,
      teamMode: TeamMode.HeadToHead,
      event: "match_end",
      scores: [
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[0][1]).toString(),
          score: 100000,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        },
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[1][1]).toString(),
          score: 100001,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        }
      ]
    },
    {
      mapNumber: 2,
      multiplayerId: requests.addLobby2Request.banchoMultiplayerId,
      mapId: "BM1",
      startTime: new Date().getTime() + 112,
      endTime: new Date().getTime() + 412,
      teamMode: TeamMode.HeadToHead,
      event: "match_end",
      scores: [
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[0][1]).toString(),
          score: 100000,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        },
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[1][1]).toString(),
          score: 100001,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        }
      ]
    },
    {
      mapNumber: 3,
      multiplayerId: requests.addLobby2Request.banchoMultiplayerId,
      mapId: "BM4",
      startTime: new Date().getTime() + 123,
      endTime: new Date().getTime() + 423,
      teamMode: TeamMode.HeadToHead,
      event: "match_end",
      scores: [
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[0][1]).toString(),
          score: 100000,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        },
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[1][1]).toString(),
          score: 100001,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        }
      ]
    },
    {
      mapNumber: 4,
      multiplayerId: requests.addLobby2Request.banchoMultiplayerId,
      mapId: "BM5",
      startTime: new Date().getTime() + 134,
      endTime: new Date().getTime() + 434,
      teamMode: TeamMode.HeadToHead,
      event: "match_end",
      scores: [
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[0][1]).toString(),
          score: 100000,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        },
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[1][1]).toString(),
          score: 100001,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        }
      ]
    }
  ]
};

const lobby2ApiResults2: ApiMultiplayer = {
  multiplayerId: requests.addLobby2Request.banchoMultiplayerId,
  matches: [
    ...lobby2ApiResults1.matches,
    {
      mapNumber: 5,
      multiplayerId: requests.addLobby2Request.banchoMultiplayerId,
      mapId: "BM3",
      startTime: new Date().getTime() + 145,
      endTime: new Date().getTime() + 445,
      teamMode: TeamMode.HeadToHead,
      event: "match_end",
      scores: [
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[0][1]).toString(),
          score: 100000,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        },
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[1][1]).toString(),
          score: 100001,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        }
      ]
    },
    {
      mapNumber: 6,
      multiplayerId: requests.addLobby2Request.banchoMultiplayerId,
      mapId: "BM3",
      startTime: new Date().getTime() + 156,
      endTime: new Date().getTime() + 456,
      teamMode: TeamMode.HeadToHead,
      event: "match_end",
      scores: [
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[0][1]).toString(),
          score: 100000,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        },
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[1][1]).toString(),
          score: 100001,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        }
      ]
    }
  ]
};

const lobby1ApiResults2: ApiMultiplayer = {
  multiplayerId: values.banchoMultiplayerIds.lobby1,
  matches: [
    ...lobby1ApiResults1.matches,
    {
      mapNumber: 6,
      multiplayerId: values.banchoMultiplayerIds.lobby1,
      mapId: "BM5",
      startTime: new Date().getTime() + 567,
      endTime: new Date().getTime() + 867,
      teamMode: TeamMode.HeadToHead,
      event: "match_end",
      scores: [
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[0][0]).toString(),
          score: 100000,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        },
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[1][0]).toString(),
          score: 100001,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        }
      ]
    }
  ]
};

const lobby1ApiResults3: ApiMultiplayer = {
  multiplayerId: values.banchoMultiplayerIds.lobby1,
  matches: [
    ...lobby1ApiResults2.matches,
    {
      mapNumber: 7,
      multiplayerId: values.banchoMultiplayerIds.lobby1,
      mapId: "BM5",
      startTime: new Date().getTime() + 1200,
      endTime: new Date().getTime() + 1400,
      teamMode: TeamMode.HeadToHead,
      event: "match_end",
      scores: [
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[0][0]).toString(),
          score: 100000,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        },
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[1][0]).toString(),
          score: 100001,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        }
      ]
    }
  ]
};

const lobby2ApiResults3: ApiMultiplayer = {
  multiplayerId: requests.addLobby2Request.banchoMultiplayerId,
  matches: [
    ...lobby2ApiResults2.matches,
    {
      mapNumber: 7,
      multiplayerId: requests.addLobby2Request.banchoMultiplayerId,
      mapId: "BM5", // lobby#2, BM5#2
      startTime: new Date().getTime() + 678,
      endTime: new Date().getTime() + 978,
      teamMode: TeamMode.HeadToHead,
      event: "match_end",
      scores: [
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[0][1]).toString(),
          score: 100000,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        },
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[1][1]).toString(),
          score: 100001,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        }
      ]
    }
  ]
};

const lobby2ApiResults4: ApiMultiplayer = {
  multiplayerId: requests.addLobby2Request.banchoMultiplayerId,
  matches: [
    ...lobby2ApiResults3.matches,
    {
      mapNumber: 8,
      multiplayerId: requests.addLobby2Request.banchoMultiplayerId,
      mapId: "BM5", // lobby#2, BM5#3
      startTime: new Date().getTime() + 1600,
      endTime: new Date().getTime() + 1800,
      teamMode: TeamMode.HeadToHead,
      event: "match_end",
      scores: [
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[0][1]).toString(),
          score: 100000,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        },
        {
          osuUserId: FakeOsuApiFetcher.getFakeBanchoUserId(values.teams._2v2[1][1]).toString(),
          score: 100001,
          passed: true,
          scoreLetterGrade: "A",
          accuracy: 12.34
        }
      ]
    }
  ]
};

export const context = {
  values: values,
  requests: requests,
  osuApiResults: {
    lobby1ApiResults1: lobby1ApiResults1,
    lobby1ApiResults2: lobby1ApiResults2,
    lobby1ApiResults3: lobby1ApiResults3,
    lobby2ApiResults1: lobby2ApiResults1,
    lobby2ApiResults2: lobby2ApiResults2,
    lobby2ApiResults3: lobby2ApiResults3,
    lobby2ApiResults4: lobby2ApiResults4
  }
};
