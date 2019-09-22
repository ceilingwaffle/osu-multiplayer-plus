type MatchEventType = "team_won" | "team_eliminated";

interface DataFoo {
  readonly data: any;
}

interface MatchEvent extends DataFoo {
  readonly type: MatchEventType;
  determine: () => void;
  after?: () => void;
}

abstract class AbstractMatchEvent<DataType> implements DataFoo {
  readonly data: DataType;
}

class TeamWonMatchEvent extends AbstractMatchEvent<{ teamId: number }> implements MatchEvent {
  type: MatchEventType = "team_won";

  determine(): void {
    console.log(`Calling ${this.determine.name} in ${this.constructor.name}`);
  }

  after(): void {
    console.log(`Calling ${this.after.name} in ${this.constructor.name}`);
  }
}

class TeamEliminatedMatchEvent extends AbstractMatchEvent<{ teamId: number }> implements MatchEvent {
  type: MatchEventType = "team_eliminated";

  determine(): void {
    console.log(`Calling ${this.determine.name} in ${this.constructor.name}`);
  }
}

class EventRegistrar {
  events: MatchEvent[] = [];

  register(event: MatchEvent) {
    if (this.events.find(e => e.type === event.type)) {
      throw new Error(`${event.constructor.name} type '${event.type}' already registered in ${this.constructor.name}.`);
    }

    event.data;

    this.events.push(event);

    if (event.after) event.after();
    if (event.determine) event.determine();
  }
}

const teamWonEvent1 = new TeamWonMatchEvent();
// const teamWonEvent2 = new TeamWonMatchEvent();
const teamEliminastedEvent1 = new TeamEliminatedMatchEvent();
// const teamEliminatedEvent = new MatchEvent<{ teamId: number }>("team_eliminated");
const registrar = new EventRegistrar();
registrar.register(teamWonEvent1);
registrar.register(teamEliminastedEvent1);
