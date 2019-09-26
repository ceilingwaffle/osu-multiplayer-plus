// import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
// import { GameStatusType } from "./types/game-status.type";
// import { Game } from "./game.entity";

// @Entity("game_statuses")
// export class GameStatus {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @Column({ default: GameStatusType.UNKNOWN })
//   text: GameStatusType;

//   @OneToMany(type => Game, game => game.status)
//   games: Game[];
// }
