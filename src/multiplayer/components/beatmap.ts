export interface Beatmap {
  // e.g. kanonxkanon - Calendula Requiem [Shiki Revive] | DT | 7.09*
  // mapString: string;

  beatmapId: string;
  beatmapSetId: string;
  beatmapUrl: string;
  diffName: string;
  stars: number;
  title: string;
  artist: string;
  backgroundThumbnailUrlLarge: string;
  backgroundThumbnailUrlSmall: string;
}
