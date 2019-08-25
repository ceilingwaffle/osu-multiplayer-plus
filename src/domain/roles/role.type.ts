export const gameAdminRoles = ["game-creator", "referee"] as const;

export type Role = "admin" | "player" | typeof gameAdminRoles[number];

export const getRefereeRole = () => {
  return gameAdminRoles.find(refRole => refRole === "referee");
};
