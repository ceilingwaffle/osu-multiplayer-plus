import { Lobby } from "../components/lobby";
import { Match } from "../components/match";
import { MatchTeamLine } from "../components/match-team-line";

export class MatchReport {
  lobby: Lobby;
  match: Match;
  teamLines: MatchTeamLine[];
}
