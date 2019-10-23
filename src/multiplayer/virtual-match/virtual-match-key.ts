export interface VirtualMatchKey {
  beatmapId: string;
  /** Number representing how many times (up to this point in time) the same beatmap was played in a lobby.
   * e.g. If beatmap with ID 123 was played 2 times in a lobby, this number will be 2 during the second time this beatmap was played. */
  sameBeatmapNumber: number;
}
