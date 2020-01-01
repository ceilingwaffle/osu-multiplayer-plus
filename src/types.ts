export const TYPES = {
  GameController: Symbol.for("GameController"),
  IOsuLobbyScanner: Symbol.for("IOsuLobbyScanner"),
  GameService: Symbol.for("GameService"),
  UserService: Symbol.for("UserService"),
  UserController: Symbol.for("UserController"),
  LobbyService: Symbol.for("LobbyService"),
  LobbyController: Symbol.for("LobbyController"),
  MatchService: Symbol.for("MatchService"),
  TeamController: Symbol.for("TeamController"),
  TeamService: Symbol.for("TeamService"),
  Permissions: Symbol.for("Permissions"),
  RequesterFactory: Symbol.for("RequesterFactory"),
  IOsuApiFetcher: Symbol.for("IOsuApiFetcher"),
  // IsValidBanchoMultiplayerIdConstraint: Symbol.for("IsValidBanchoMultiplayerIdConstraint")
  GameEventRegistrarCollection: Symbol.for("GameEventRegistrarCollection"),
  IDbClient: Symbol.for("IDbClient"),
  MultiplayerResultsListener: Symbol.for("MultiplayerResultsListener"),
  IEventDispatcher: Symbol.for("IEventDispatcher"),
  DiscordBot: Symbol.for("DiscordBot")
};

export default TYPES;
