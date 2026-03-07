import { EventEmitter } from "node:events";

export type GovernorEvent = {
  type: "audit.created" | "audit.updated" | "approval.updated" | "run.updated" | "event.ingested";
  org_id: string;
  payload: Record<string, unknown>;
};

export class GovernorEventBus {
  private readonly emitter = new EventEmitter();

  publish(event: GovernorEvent) {
    this.emitter.emit("event", event);
  }

  subscribe(listener: (event: GovernorEvent) => void): () => void {
    this.emitter.on("event", listener);
    return () => {
      this.emitter.off("event", listener);
    };
  }
}

export function createEventBus() {
  return new GovernorEventBus();
}
