import { ApiMatch } from "./api-match";

export type ApiMultiplayer = {
  multiplayerId: string;
  matches: ApiMatch[];
  targetGameIds?: Set<number>;
};
