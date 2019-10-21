import { ScoringType } from "./enums/scoring-type";

export interface Lobby {
  banchoLobbyId: string; // e.g. 51544180
  lobbyName: string; // e.g. Waffle's Game
  resultsUrl: string; // e.g. https://osu.ppy.sh/community/matches/51544180
  scoreType: ScoringType;
}
