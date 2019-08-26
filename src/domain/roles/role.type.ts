export const gameAdminRoles = ["game-creator", "referee"] as const;

const lowestUserRole = "user" as const;

export type Role = "admin" | typeof gameAdminRoles[number] | "player" | typeof lowestUserRole;

export const getRefereeRole = () => {
  return gameAdminRoles.find(refRole => refRole === "referee");
};

export const getLowestUserRole = () => {
  return lowestUserRole;
};
