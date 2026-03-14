import {
  ExternalEventEnvelope,
  TemplateCard,
  ShowCard,
  TriggerCondition,
  ConditionOp,
  CardBehaviour,
} from "./types";

export type EventEvaluationDecision =
  | { decision: "ignore" }
  | { decision: "interrupt"; cardId: string }
  | { decision: "queue"; cardId: string };

export interface EventEvaluatorOptions {
  /**
   * If true, missing fields in payload count as failing conditions.
   * If false, missing payload fields are ignored.
   */
  strict?: boolean;
}

/**
 * Main entry: match external event → find event cards → evaluate conditions → output decision.
 */
export function evaluateExternalEvent(
  incoming: ExternalEventEnvelope,
  eventCards: TemplateCard[], // cards from Event Playbook
  options: EventEvaluatorOptions = {}
): EventEvaluationDecision {
  const strict = options.strict ?? true;

  // 1. Filter event cards by base match (source & type)
  const candidates = eventCards.filter((card) =>
    matchesEventType(card, incoming)
  );

  if (candidates.length === 0) {
    return { decision: "ignore" };
  }

  // 2. From candidates, find the first one whose conditions pass
  for (const card of candidates) {
    if (conditionsPass(card, incoming.payload, strict)) {
      // 3. Behaviour: priority decides interrupt/queue
      const behaviour = card.behaviour;

      if (!behaviour) {
        // default to interrupt if no behaviour is specified
        return { decision: "interrupt", cardId: card.id };
      }

      if (behaviour.priority === "interrupt") {
        return { decision: "interrupt", cardId: card.id };
      }

      if (behaviour.priority === "queue") {
        return { decision: "queue", cardId: card.id };
      }

      // normal → treat as interrupt for v1
      return { decision: "interrupt", cardId: card.id };
    }
  }

  return { decision: "ignore" };
}

//
// Internal helpers
//

/**
 * Base event → card type match (source + event type)
 */
function matchesEventType(
  card: TemplateCard,
  incoming: ExternalEventEnvelope
): boolean {
  if (card.trigger.mode !== "external") return false;

  const ext = card.trigger.external;
  if (!ext) return false;

  const sourceMatch = ext.source === incoming.source;
  const typeMatch = ext.type === incoming.type;

  return sourceMatch && typeMatch;
}

/**
 * Evaluate all card.trigger.external.conditions[] against the incoming event payload.
 */
function conditionsPass(
  card: TemplateCard,
  payload: any,
  strict: boolean
): boolean {
  const ext = card.trigger.external;
  if (!ext?.conditions || ext.conditions.length === 0) {
    // No conditions → auto pass
    return true;
  }

  for (const cond of ext.conditions) {
    if (!evaluateCondition(cond, payload, strict)) {
      return false;
    }
  }
  return true;
}

/**
 * Evaluate a single condition.
 */
function evaluateCondition(
  cond: TriggerCondition,
  payload: any,
  strict: boolean
): boolean {
  const { field, op, value } = cond;

  const incomingValue = payload?.[field];

  // If strict and field not present → fail
  if (incomingValue === undefined && strict) return false;
  // If not strict and field missing → ignore condition
  if (incomingValue === undefined && !strict) return true;

  switch (op) {
    case "==":
      return incomingValue == value;
    case "!=":
      return incomingValue != value;
    case ">":
      return incomingValue > value;
    case ">=":
      return incomingValue >= value;
    case "<":
      return incomingValue < value;
    case "<=":
      return incomingValue <= value;
    case "contains":
      return Array.isArray(incomingValue)
        ? incomingValue.includes(value)
        : typeof incomingValue === "string"
        ? incomingValue.includes(value as string)
        : false;
    case "not_contains":
      return Array.isArray(incomingValue)
        ? !incomingValue.includes(value)
        : typeof incomingValue === "string"
        ? !incomingValue.includes(value as string)
        : true;
    default:
      // future-proof: unknown op → ignore condition
      return true;
  }
}
