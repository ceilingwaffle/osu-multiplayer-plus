/**
 * Enum for the gamemodes. - Note that the 'all' mode CANNOT be used for all functions (it is a shortcut for undefined), please consult the osu!api wiki for more clear information. (eg, replay data MUST give the mode, where as it is provided as convenience when getting beatmaps and wanting to specify the 'limit' value.)
 */
export enum GameMode {
  OSU,
  TAIKO,
  CTB,
  MANIA,
  ALL = undefined
}
