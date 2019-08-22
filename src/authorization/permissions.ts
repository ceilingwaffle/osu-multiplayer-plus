import { AccessControl } from "role-acl";

export class Permissions {
  private _ac: AccessControl;

  constructor() {
    this._ac = new AccessControl();

    this.load();
  }

  private load(): void {
    let grantsObject = [
      // permission = ac.can('creator').context({ requesterUserId: 1, creatorUserId: 1  }).execute('update').on('game'); -> true
      // permission = ac.can('creator').context({ requesterUserId: 1, creatorUserId: 2  }).execute('update').on('game'); -> false
      // permission = ac.can('creator').context({ requesterUserId: 1, refereeUserId: 1  }).execute('update').on('game'); -> true

      // condition: {
      //   Fn: "EQUALS",
      //   args: { requesterUserId: "$.gameCreatorUserId" }
      // }

      { resource: "*", role: "admin", action: "*" },

      { resource: "game", role: ["game-creator", "referee"], action: ["update", "end"] },

      { resource: "lobby", role: ["game-creator", "referee"], action: ["add", "remove"] }
    ];

    this._ac.setGrants(grantsObject);
  }

  get ac(): AccessControl {
    return this._ac;
  }
}
