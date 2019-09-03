export const gameAdminRoles = ["game-creator", "referee"] as const;

const lowestUserRole = "user" as const;

export type Role = "admin" | typeof gameAdminRoles[number] | "player" | typeof lowestUserRole;

export const getRefereeRole = (): string => {
  return gameAdminRoles.find(refRole => refRole === "referee");
};

/**
 * Gets the roles defined as "at least a ref" (not including admin).
 * e.g. game-creator, game-referee.
 */
export const getRefereeTypeRoles = (): string[] => {
  return gameAdminRoles.map(role => role.valueOf());
};

export const getLowestUserRole = () => {
  return lowestUserRole;
};
