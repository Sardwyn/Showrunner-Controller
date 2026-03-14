import {
  RundownTemplate,
  ShowInstance,
  ShowCard,
  TemplateGroup,
  RawRuntimeEffect,
  ExecuteEnterActionsEffect,
  ExecuteExitActionsEffect,
  CardStatus,
  LayoutMode,
  SceneRole,
} from "./types";


//
// 1. Reducer action types
//

export interface LoadTemplateAction {
  type: "LOAD_TEMPLATE";
  template: RundownTemplate;
  showId?: string;
  title?: string;
  routingProfileId?: string;
}

export interface StartShowAction {
  type: "START_SHOW";
  startedAt?: number; // epoch seconds; if not provided, use Date.now()/1000
}

export interface SelectItemAction {
  type: "SELECT_ITEM";
  itemId: string;
  manual?: boolean; // operator-driven jump
}

export interface NextItemAction {
  type: "NEXT_ITEM";
  // optional: constrain to current group or allow cross-group
  stayInGroup?: boolean;
}

export interface SkipNextItemAction {
  type: "SKIP_NEXT_ITEM";
  stayInGroup?: boolean;
}

export interface UpdateTimerAction {
  type: "UPDATE_TIMER";
  deltaSeconds: number; // time since last tick
}

export interface ExternalEventReceivedAction {
  type: "EXTERNAL_EVENT_RECEIVED";
  cardId: string; // id of event card to activate (already matched by event evaluator)
}

export interface EndInterruptAction {
  type: "END_INTERRUPT";
}

export interface ModifyItemRuntimeAction {
  type: "MODIFY_ITEM_RUNTIME";
  itemId: string;
  patch: Partial<Omit<ShowCard, "id">>;
}

export type RundownReducerAction =
  | LoadTemplateAction
  | StartShowAction
  | SelectItemAction
  | NextItemAction
  | SkipNextItemAction
  | UpdateTimerAction
  | ExternalEventReceivedAction
  | EndInterruptAction
  | ModifyItemRuntimeAction;


//
// 2. Reducer result
//

export interface RundownReducerResult {
  state: ShowInstance;
  effects: RawRuntimeEffect[];
}


//
// 3. Public helpers
//

/**
 * Create a fresh ShowInstance from a template.
 * This is pure; no timestamps are set here – that happens on START_SHOW.
 */
export function createShowInstanceFromTemplate(
  template: RundownTemplate,
  showId: string,
  options?: {
    title?: string;
    routingProfileId?: string;
  }
): ShowInstance {
  const groups: TemplateGroup[] = template.groups.map((g) => ({
    id: g.id,
    title: g.title,
    itemIds: [...g.itemIds],
  }));

  const items: Record<string, ShowCard> = {};

  for (const [id, card] of Object.entries(template.items)) {
    items[id] = {
      ...card,
      status: "pending",
      elapsed: 0,
      modified: false,
      overriddenFields: undefined,
    };
  }

  const firstItemId = findFirstItemId(groups);

  return {
    id: showId,
    templateId: template.id,
    title: options?.title ?? template.title,
    startedAt: undefined,
    endedAt: undefined,
    currentItemId: firstItemId,
    interruptStack: [],
    groups,
    items,
    routingProfileId: options?.routingProfileId,
    metadata: {},
  };
}

/**
 * Find the first card id in the first group, if any.
 */
function findFirstItemId(groups: TemplateGroup[]): string | undefined {
  for (const g of groups) {
    if (g.itemIds.length > 0) {
      return g.itemIds[0];
    }
  }
  return undefined;
}

/**
 * Small helper to construct an enter-actions effect
 */
function makeEnterEffect(itemId: string): ExecuteEnterActionsEffect {
  return {
    type: "EXECUTE_ENTER_ACTIONS",
    payload: { itemId },
  };
}

/**
 * Small helper to construct an exit-actions effect
 */
function makeExitEffect(itemId: string): ExecuteExitActionsEffect {
  return {
    type: "EXECUTE_EXIT_ACTIONS",
    payload: { itemId },
  };
}

/**
 * Generic transition from currentItemId → targetItemId
 * Handles exit/enter effects and status flips.
 */
function transitionToItem(
  state: ShowInstance,
  targetItemId: string,
  options?: {
    markPreviousDone?: boolean;
  }
): RundownReducerResult {
  const effects: RawRuntimeEffect[] = [];
  const newState: ShowInstance = {
    ...state,
    items: { ...state.items },
  };

  const prevId = state.currentItemId;
  if (prevId && prevId !== targetItemId) {
    const prevCard = newState.items[prevId];
    if (prevCard) {
      // Mark previous as done if requested
      if (options?.markPreviousDone && prevCard.status === "live") {
        prevCard.status = "done";
      }
      // Always emit exit actions when leaving
      effects.push(makeExitEffect(prevId));
    }
  }

  const nextCard = newState.items[targetItemId];
  if (!nextCard) {
    // nothing to transition to
    return { state, effects: [] };
  }

  // If card is pending, mark live
  if (nextCard.status === "pending") {
    nextCard.status = "live";
  }
  newState.currentItemId = targetItemId;
  effects.push(makeEnterEffect(targetItemId));

  return { state: newState, effects };
}

/**
 * Start an interrupt given the id of an event/interrupt card.
 * - Pushes the current card onto the interruptStack (with its elapsed time)
 * - Fires exit for the base card
 * - Marks the interrupt card live and sets it as current
 */
function startInterruptWithCard(
  state: ShowInstance,
  cardId: string
): RundownReducerResult {
  const effects: RawRuntimeEffect[] = [];
  const newState: ShowInstance = {
    ...state,
    items: { ...state.items },
    interruptStack: [...state.interruptStack],
  };

  const interruptCard = newState.items[cardId];
  if (!interruptCard) {
    return { state, effects: [] };
  }

  const currentId = state.currentItemId;
  if (currentId) {
    const currentCard = newState.items[currentId];
    if (currentCard) {
      // Fire exit actions for whatever was currently live.
      if (currentCard.status === "live") {
        effects.push(makeExitEffect(currentId));
      }

      // Push a frame so we can restore this card when the interrupt ends.
      newState.interruptStack.push({
        itemId: currentId,
        previousElapsed: currentCard.elapsed,
        previousStartedAt: state.startedAt,
      });
    }
  }

  // Mark the interrupt card as live and make it the current item.
  if (interruptCard.status === "pending") {
    interruptCard.status = "live";
    interruptCard.elapsed = 0;
  }

  newState.currentItemId = cardId;
  effects.push(makeEnterEffect(cardId));

  return { state: newState, effects };
}

/**
 * End the current interrupt and restore previous item from stack.
 */
function endInterrupt(state: ShowInstance): RundownReducerResult {
  const effects: RawRuntimeEffect[] = [];

  if (!state.currentItemId || state.interruptStack.length === 0) {
    // nothing to do
    return { state, effects: [] };
  }

  const newState: ShowInstance = {
    ...state,
    items: { ...state.items },
    interruptStack: [...state.interruptStack],
  };

  const interruptId = state.currentItemId;
  const interruptCard = newState.items[interruptId];

  if (interruptCard && interruptCard.status === "live") {
    // Mark the interrupt card as done and fire its exit actions.
    interruptCard.status = "done";
    effects.push(makeExitEffect(interruptId));
  }

  // Pop the top interrupt frame so we can restore the previous item.
  const frame = newState.interruptStack[newState.interruptStack.length - 1];
  newState.interruptStack = newState.interruptStack.slice(0, -1);

  const restoredId = frame?.itemId;
  if (restoredId) {
    const restoredCard = newState.items[restoredId];
    if (restoredCard) {
      // Restore elapsed time if we captured it when the interrupt began.
      if (typeof frame.previousElapsed === "number") {
        restoredCard.elapsed = frame.previousElapsed;
      }

      // Ensure the restored card is live again.
      if (restoredCard.status !== "live") {
        restoredCard.status = "live";
      }

      newState.currentItemId = restoredId;
      effects.push(makeEnterEffect(restoredId));
      return { state: newState, effects };
    }
  }

  // If we can't restore a previous card, just clear the current item.
  newState.currentItemId = undefined;
  return { state: newState, effects };
}

/**
 * The main rundown reducer
 */
export function rundownReducer(
  state: ShowInstance,
  action: RundownReducerAction
): RundownReducerResult {
  switch (action.type) {
    case "LOAD_TEMPLATE": {
      const newState = createShowInstanceFromTemplate(
        action.template,
        action.showId ?? `show-${Date.now()}`,
        {
          title: action.title,
          routingProfileId: action.routingProfileId,
        }
      );
      return { state: newState, effects: [] };
    }

    case "START_SHOW": {
      // If the show is already started, ignore duplicate start requests.
      if (state.startedAt) {
        return { state, effects: [] };
      }

      const startedAt = action.startedAt ?? Math.floor(Date.now() / 1000);

      // Decide which item should go live first:
      //  - Prefer the currentItemId if present
      //  - Fallback to the very first item in the rundown
      const firstItemId =
        state.currentItemId ?? findFirstItemId(state.groups) ?? null;

      // If there's no item in the rundown at all, just mark the show as started.
      if (!firstItemId) {
        const bareState: ShowInstance = {
          ...state,
          startedAt,
        };
        return { state: bareState, effects: [] };
      }

      // Attach startedAt, then transition into the first item so we get
      // consistent enter / exit semantics and "live" status.
      const baseState: ShowInstance = {
        ...state,
        startedAt,
      };

      const { state: withCurrent, effects } = transitionToItem(
        baseState,
        firstItemId,
        { markPreviousDone: false }
      );

      return { state: withCurrent, effects };
    }

    case "SELECT_ITEM": {
      const { itemId } = action;

      // If the item doesn't exist, bail
      if (!state.items[itemId]) {
        return { state, effects: [] };
      }

      // Clone items so we can mutate safely
      const items = { ...state.items };

      // Build a flat, ordered list of all item IDs
      const orderedIds: string[] = state.groups.flatMap((g) => g.itemIds);

      let reachedSelected = false;

      // 1) Re-arm statuses relative to the clicked item
      for (const id of orderedIds) {
        const card = items[id];
        if (!card) continue;

        if (id === itemId) {
          // This is the new start point
          reachedSelected = true;
          card.status = "live";
          continue;
        }

        if (!reachedSelected) {
          // Before the selected card: keep them as "done" (show already passed them)
          // If you want to allow rewinding, you could also force them to "done" here.
          if (card.status !== "done") {
            card.status = "done";
          }
        } else {
          // After the selected card: re-arm as pending
          card.status = "pending";
        }
      }

      const effects: RawRuntimeEffect[] = [];

      // 2) If there was a previously live item, fire its exit actions
      if (state.currentItemId && state.currentItemId !== itemId) {
        effects.push({
          type: "EXECUTE_EXIT_ACTIONS",
          payload: { itemId: state.currentItemId },
        });
      }

      // 3) Fire enter actions for the newly selected item
      effects.push({
        type: "EXECUTE_ENTER_ACTIONS",
        payload: { itemId },
      });

      return {
        state: {
          ...state,
          currentItemId: itemId,
          items,
        },
        effects,
      };
    }

    case "NEXT_ITEM": {
      // If we're currently in an interrupt, treat NEXT as:
      // 1) End the interrupt (restoring the base card), then
      // 2) Move to the next card after that base card.
      if (state.interruptStack.length > 0 && state.currentItemId) {
        const top = state.interruptStack[state.interruptStack.length - 1];
        const baseId = top?.itemId;

        if (baseId && baseId !== state.currentItemId) {
          // First, close out the interrupt and restore the base card.
          const { state: afterEnd, effects: endEffects } = endInterrupt(state);

          const nextFromBase = findNextItemId(
            afterEnd,
            baseId,
            action.stayInGroup ?? false
          );

          if (!nextFromBase) {
            // Nothing after the base card – just commit the endEffects.
            return { state: afterEnd, effects: endEffects };
          }

          const { state: s2, effects: transEffects } = transitionToItem(
            afterEnd,
            nextFromBase,
            { markPreviousDone: true }
          );

          return { state: s2, effects: [...endEffects, ...transEffects] };
        }
      }

      const nextId = findNextItemId(
        state,
        state.currentItemId ?? null,
        action.stayInGroup ?? false
      );
      if (!nextId) {
        // No-op if no next item
        return { state, effects: [] };
      }
      const { state: s2, effects } = transitionToItem(state, nextId, {
        markPreviousDone: true,
      });
      return { state: s2, effects };
    }

    case "SKIP_NEXT_ITEM": {
      if (!state.currentItemId) {
        return { state, effects: [] };
      }

      const nextId = findNextItemId(
        state,
        state.currentItemId,
        action.stayInGroup ?? false
      );
      if (!nextId) {
        // nothing in front to skip
        return { state, effects: [] };
      }

      const target = state.items[nextId];
      if (!target) {
        return { state, effects: [] };
      }

      const newItems: Record<string, ShowCard> = {
        ...state.items,
        [nextId]: {
          ...target,
          status: "skipped",
        },
      };

      return {
        state: {
          ...state,
          items: newItems,
        },
        effects: [],
      };
    }

    case "UPDATE_TIMER": {
      // Don’t tick anything if the show hasn’t actually started
      if (!state.startedAt) {
        return { state, effects: [] };
      }

      if (!state.currentItemId) {
        return { state, effects: [] };
      }

      const card = state.items[state.currentItemId];
      if (!card || card.status !== "live") {
        return { state, effects: [] };
      }

      const newElapsed = Math.max(0, card.elapsed + action.deltaSeconds);

      const tickedState: ShowInstance = {
        ...state,
        items: {
          ...state.items,
          [state.currentItemId]: {
            ...card,
            elapsed: newElapsed,
          },
        },
      };

      // If this is an interrupt card with a bounded duration, auto-end it.
      const isInterrupt =
        card.behaviour && card.behaviour.priority === "interrupt";
      const hasDuration =
        typeof card.duration === "number" && card.duration > 0;

      if (
        isInterrupt &&
        hasDuration &&
        newElapsed >= (card.duration as number) &&
        tickedState.interruptStack.length > 0
      ) {
        const { state: s2, effects } = endInterrupt(tickedState);
        return { state: s2, effects };
      }

      return { state: tickedState, effects: [] };
    }

    case "EXTERNAL_EVENT_RECEIVED": {
      const card = state.items[action.cardId];
      if (!card) {
        // unknown card – ignore safely
        return { state, effects: [] };
      }

      // For now we treat external-triggered cards with interrupt behaviour
      // as true interrupts that pause the base card.
      const { state: s2, effects } = startInterruptWithCard(
        state,
        action.cardId
      );
      return { state: s2, effects };
    }

    case "END_INTERRUPT": {
      const { state: s2, effects } = endInterrupt(state);
      return { state: s2, effects };
    }

    case "MODIFY_ITEM_RUNTIME": {
      const card = state.items[action.itemId];
      if (!card) return { state, effects: [] };

      const patched: ShowCard = {
        ...card,
        ...action.patch,
        modified: true,
        overriddenFields: {
          ...(card.overriddenFields ?? {}),
          ...action.patch,
        },
      };

      const newState: ShowInstance = {
        ...state,
        items: {
          ...state.items,
          [action.itemId]: patched,
        },
      };

      return { state: newState, effects: [] };
    }

    default:
      return { state, effects: [] };
  }
}

/**
 * Find the "next" item in the rundown after currentItemId.
 * If stayInGroup is true, only search within the current group.
 * Otherwise, advance to subsequent groups.
 */
function findNextItemId(
  state: ShowInstance,
  currentItemId: string | null,
  stayInGroup: boolean
): string | null {
  const { groups } = state;
  if (!groups.length) return null;

  // If no current item yet, just return the first pending card
  if (!currentItemId) {
    for (const g of groups) {
      for (const id of g.itemIds) {
        const card = state.items[id];
        if (card && card.status === "pending") return id;
      }
    }
    return null;
  }

  // Find the group and position of currentItemId
  let currentGroupIndex = -1;
  let currentIndexInGroup = -1;

  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    const idx = g.itemIds.indexOf(currentItemId);
    if (idx !== -1) {
      currentGroupIndex = gi;
      currentIndexInGroup = idx;
      break;
    }
  }

  if (currentGroupIndex === -1) {
    // current item not found in any group – fallback to first pending
    for (const g of groups) {
      for (const id of g.itemIds) {
        const card = state.items[id];
        if (card && card.status === "pending") return id;
      }
    }
    return null;
  }

  // Search forward in current group
  const currentGroup = groups[currentGroupIndex];
  for (let i = currentIndexInGroup + 1; i < currentGroup.itemIds.length; i++) {
    const id = currentGroup.itemIds[i];
    const card = state.items[id];
    if (card && card.status === "pending") return id;
  }

  if (stayInGroup) {
    return null;
  }

  // Search subsequent groups
  for (let gi = currentGroupIndex + 1; gi < groups.length; gi++) {
    const g = groups[gi];
    for (const id of g.itemIds) {
      const card = state.items[id];
      if (card && card.status === "pending") return id;
    }
  }

  return null;
}
