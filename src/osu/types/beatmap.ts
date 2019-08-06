/**
 * Beatmap class
 */
export type Beatmap = {
  /**
   * Approval status [alias: rankedStatus]
   */
  approved: ApprovalStatusType;
  rankedStatus: ApprovalStatusType;
  /**
   * Date it was first submitted
   */
  submitDate: Date;
  /**
   * Date it was approved
   */
  approvedDate: Date;
  /**
   * The date the map was last updated
   */
  lastUpdate: Date;
  /**
   * The song artist
   */
  artist: string;
  /**
   * Beatmap id [alias: beatmapId]
   */
  id: number;
  /**
   * Beatmap id [alias of: id]
   */
  beatmapId: number;
  /**
   * Beatmap set id [alias: beatmapSetId]
   */
  setId: number;
  /**
   * Beatmap set id [alias of: setId]
   */
  beatmapSetId: number;
  /**
   * Song BPM
   */
  bpm: number;
  /**
   * The beatmap creator [alias: mapper]
   */
  creator: string;
  /**
   * The beatmap creator [alias of: creator]
   */
  mapper: string;
  /**
   * The user id of the beatmap creator [alias: mapperId]
   */
  creatorId: number;
  /**
   * The user id of the beatmap creator [alias of: creatorId]
   */
  mapperId: number;
  /**
   * The difficulty rating [alias: stars]
   */
  difficultyRating: number;
  /**
   * The difficulty rating [alias of: difficultyRating]
   */
  stars: number;
  /**
   * Difficulty size (aka CS) [alias: circleSize, CS]
   */
  diffSize: number;
  /**
   * Difficulty size (aka CS) [alias of: diffSize]
   */
  circleSize: number;
  /**
   * Difficulty size (aka CS) [alias of: diffSize]
   */
  CS: number;
  /**
   * Difficulty overall (aka OD) [alias: overallDifficulty, OD]
   */
  diffOverall: number;
  /**
   * Difficulty overall (aka OD) [alias of: diffOverall]
   */
  overallDifficulty: number;
  /**
   * Difficulty overall (aka OD) [alias of: diffOverall]
   */
  OD: number;
  /**
   * Difficulty approach (aka AR) [alias: approachRate, AR]
   */
  diffApproach: number;
  /**
   * Difficulty approach (aka AR) [alias of: diffApproach]
   */
  approachRate: number;
  /**
   * Difficulty approach (aka AR) [alias of: diffApproach]
   */
  AR: number;
  /**
   * Difficulty drain (aka HP) [alias: hpDrain, HP]
   */
  diffDrain: number;
  /**
   * Difficulty drain (aka HP) [alias of: diffDrain]
   */
  hpDrain: number;
  /**
   * Difficulty drain (aka HP) [alias of: diffDrain]
   */
  HP: number;
  /**
   * Amount of normal notes (hitcircles).
   */
  countNormal: number;
  /**
   * Amount of slider notes.
   */
  countSlider: number;
  /**
   * Amount of spinners.
   */
  countSpinner: number;
  /**
   * Drain length
   */
  hitLength: number;
  /**
   * source The source data
   */
  source: string | null;
  /**
   * Genre metadata
   */
  genre: GenreType;
  /**
   * Language metadata
   */
  language: LanguageType;
  /**
   * Title
   */
  title: string;
  /**
   * Total length of song
   */
  totalLength: number;
  /**
   * Version (aka diffname) [alias: difficultyName]
   */
  version: string;
  /**
   * Version (aka diffname) [alias of: version]
   */
  difficultyName: string;
  /**
   * The MD5 of the file
   */
  fileMd5: string;
  /**
   * The gamemode
   */
  mode: ModeType;
  /**
   * Tags
   */
  tags: string[];
  /**
   * number of favorites on the map [alias: favoriteCount]
   */
  favouriteCount: number;
  /**
   * number of favorites on the map [alias of: favouriteCount]
   */
  favoriteCount: number;
  /**
   * User rating (1-10) [alias: userRating]
   */
  rating: number;
  /**
   * User rating (1-10) [alias of: rating]
   */
  userRating: number;
  /**
   * If beatmap is not downloadable [reverse alias: downloadAvailable]
   */
  downloadUnavailable: boolean;
  /**
   * If beatmap is downloadable [reverse alias of: downloadUnavailable]
   */
  downloadAvailable: boolean;
  /**
   * If beatmap is downloadable but has no audio [reverse alias: audioAvailable]
   */
  audioUnavailable: boolean;
  /**
   * If beatmap is downloadable and has audio [reverse alias of: audioUnavailable]
   */
  audioAvailable: boolean;
  /**
   * number of playcounts
   */
  playcount: number;
  /**
   * number of passcount
   */
  passcount: number;
  /**
   * number of map max combo
   */
  maxCombo: number;
  /**
   * Aim difficulty rated by ppv2
   */
  diffAim: number;
  /**
   * Speed difficulty rated by ppv2
   */
  diffSpeed: number;
};
