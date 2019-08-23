export const refereeRoles = ["game-creator", "referee"] as const;

export type Role = "admin" | "player" | typeof refereeRoles[number];

export const getRefereeRole = () => {
  // TODO: Get this from the refereeRoles array somehow (instead of writing it out as a copy)
  return "referee";
};
