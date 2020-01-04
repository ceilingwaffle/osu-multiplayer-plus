# osu! Multiplayer Plus

osu! Multiplayer Plus is a discord bot for adding special game-modes to normal osu! multiplayer lobbies.

**Game Modes:**
- Battle Royale
- Best of (planned)
- Tournaments (planned)

## Usage

1. [Invite the bot to your Discord server.](https://discordapp.com/api/oauth2/authorize?client_id=279825470974066688&permissions=388176&scope=bot)
2. Create a new game: ``!obr creategame``
   (Note the game ID for later.)
3. Add teams: ``!obr addteams player1 "player two" | p3 p4`` 
   (Separate teams with a vertical bar -> ``|``)   
4. Create a new multiplayer lobby in osu!
5. Add the lobby to the game: ``!obr addlobby <lobbyId>``
   (Obtain the lobby ID from the MP link at the top of the multiplayer chat.) 
   e.g. [https://osu.ppy.sh/community/matches/*51544180*](https://osu.ppy.sh/community/matches/51544180)) <- the lobby ID is 51544180.</span>
6. Start the game: ``!obr startgame <gameId>``
7. An updated leaderboard will be posted in Discord automatically after your lobby finishes each map.
8. To stop receiving leaderboard updates, end the game: ``!obr endgame <gameId>``
9. Use ``!obr help`` for a full list of all available commands and their usage.

## Built With

- [TypeScript](https://github.com/microsoft/TypeScript)
- [TypeOrm](https://github.com/typeorm) - Database ORM 
- [Mocha](https://github.com/mochajs/mocha) - Testing framework
- [Inversify](https://github.com/inversify/InversifyJS) - Inversion of Control / Dependency Injection

## ![FeelsSupportMan](https://cdn.frankerfacez.com/emoticon/405850/2) Need help?

[Join our Discord](https://discord.gg/grjFNfa) and send a message **@CeilingWaffle** in the **#br-bot-help** channel.

<!--
Dev stuff

### Prerequisites

TODO

### Installing

```
npm install
```

## Running the tests

```
npm run test
```

## Deployment

TODO
-->

## License

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details

