import { Mods } from "./mods";
import { Beatmap } from "./beatmap";
import { MatchStatus } from "./match-status";

export interface Match {
  startTime: Date;
  endTime: Date;
  /** standard = 0, taiko = 1, ctb = 2, o!m = 3 */
  playMode: string;
  /** winning condition: score = 0, accuracy = 1, combo = 2, score v2 = 3 */
  scoringType: string;
  /** Head to head = 0, Tag Co-op = 1, Team vs = 2, Tag Team vs = 3 */
  teamType: string;
  /** (if freemod, it will still have some bitwise value) see https://github.com/ppy/osu-api/wiki#mods */
  forcedMods: Mods;
  beatmap: Beatmap;
  status: MatchStatus;
}
