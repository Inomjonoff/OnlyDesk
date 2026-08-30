export interface SessionFact {
  factId: string;
  sessionId: string;
  category: "PERFORMANCE" | "ACTION" | "ERROR" | "INFO";
  statement: string;
  source: string;
  timestamp: number;
}

export class SessionFactStore {
  private facts = new Map<string, SessionFact[]>();

  public recordFact(fact: Omit<SessionFact, "factId" | "timestamp">): SessionFact {
    const fullFact: SessionFact = {
      ...fact,
      factId: `fact_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };

    const list = this.facts.get(fact.sessionId) || [];
    list.push(fullFact);
    this.facts.set(fact.sessionId, list);
    return fullFact;
  }

  public getSessionFacts(sessionId: string): SessionFact[] {
    return this.facts.get(sessionId) || [];
  }

  public clearSessionFacts(sessionId: string): void {
    this.facts.delete(sessionId);
  }
}
