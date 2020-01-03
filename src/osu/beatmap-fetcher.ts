import { inject } from "inversify";
import TYPES from "../types";
import { IOsuApiFetcher } from "./interfaces/osu-api-fetcher";
import { Log } from "../utils/log";
import iocContainer from "../inversify.config";
import { Beatmap } from "../multiplayer/components/beatmap";

export class BeatmapFetcher {
  static async getBeatmapComponentsForBeatmapIds(beatmapIds: string[]): Promise<Beatmap[]> {
    // remove any duplicate beatmapIds
    const uniqueBeatmapids = [...new Set(beatmapIds)];
    const beatmaps: Beatmap[] = [];
    for (const bmid of uniqueBeatmapids) {
      const beatmap = await BeatmapFetcher.getBeatmapComponentForBeatmapId(bmid);
      beatmaps.push(beatmap);
    }
    return beatmaps;
  }

  static async getBeatmapComponentForBeatmapId(beatmapId: string): Promise<Beatmap> {
    if (!beatmapId) Log.warn("Beatmap ID is null.");
    // todo - get from DB cache
    //      or if not cached:
    //      - fetch from osu API
    //          - save DB entity
    //          - update DB matches with reference
    const osuApi = iocContainer.get<IOsuApiFetcher>(TYPES.IOsuApiFetcher); // TODO - improve how we load ioc
    const apiBeatmapResult = await osuApi.fetchBeatmap(beatmapId);
    return {
      // mapString: `${apiBeatmapResult.artist} - ${apiBeatmapResult.title} [${apiBeatmapResult.diffName}] | DT | 7.09*}`,
      beatmapId: apiBeatmapResult.beatmapId,
      beatmapSetId: apiBeatmapResult.beatmapSetId,
      beatmapUrl: apiBeatmapResult.beatmapUrl,
      stars: apiBeatmapResult.stars,
      title: apiBeatmapResult.title,
      artist: apiBeatmapResult.artist,
      diffName: apiBeatmapResult.diffName,
      backgroundThumbnailUrlLarge: apiBeatmapResult.backgroundThumbnailUrlLarge,
      backgroundThumbnailUrlSmall: apiBeatmapResult.backgroundThumbnailUrlSmall
    };
  }
}
