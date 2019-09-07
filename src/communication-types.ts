// Do not rename these or the DB goes out of sync (see RealmType)
// TODO: Load these from the DB upon app initialization, aswell as for every "type/status" entity
export type CommunicationClientType = "discord" | "web";

/**
 * initial-channel: The channel where the first command originated (e.g. !obr creategame)
 *
 * game-channel: The channel created by the bot where all future messages will be delivered (e.g. match results)
 */
export type CommunicationChannelType = "initial-channel" | "game-channel";
