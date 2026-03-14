import {
  ShowInstance,
  RuntimeEffect,
  ShowCard,
  LayoutMode,
  SceneRole,
} from "./types";
import {
  makeEnterEffect,
  makeExitEffect,
} from "./interruptEffects"; // we'll define this below

/**
 * Determines if the show is currently inside an interrupt.
 */
export function isInInterrupt(state: ShowInstance): boolean {
  return state.interruptStack.length > 0;
}

/**
 * Returns the top-most interrupt frame (the active one).
 */
export function getActiveInterrupt(state: ShowInstance) {
  if (!state.interruptStack.length) return null;
  return state.interruptStack[state.interruptStack.length - 1];
}

/**
 * Validate and prepare an interrupt card.
 * Ensures the card exists, is not itself done, etc.
 */
export function safelyResolveInterruptCard(
  state: ShowInstance,
  cardId: string
): ShowCard | null {
  const card = state.items[cardId];
  if (!card) return null;

  // Could add more guards: ignore if card.status === "done" etc.
  return card;
}

/**
 * Push an interrupt and transition to the interrupt card.
 */
export function startInterrupt(
  state: ShowInstance,
  cardId: string
): { state: ShowInstance; effects: RuntimeEffect[] } {
  const card = safelyResolveInterruptCard(state, cardId);
  if (!card) {
    return { state, effects: [] };
  }

  const effects: RuntimeEffect[] = [];
  const newState: ShowInstance = {
    ...state,
    items: { ...state.items },
    interruptStack: [...state.interruptStack],
  };

  // Pause/exit current item if active
  const prevId = state.currentItemId;
  if (prevId) {
    const prevCard = newState.items[prevId];
    if (prevCard && prevCard.status === "live") {
      effects.push(makeExitEffect(prevId));
    }

    // Push interrupt frame to stack
    newState.interruptStack.push({
      itemId: prevId,
      previousLayoutMode: undefined as LayoutMode | undefined,
      previousSceneRole: undefined as SceneRole | undefined,
      previousStartedAt: state.startedAt,
      previousElapsed: prevCard?.elapsed,
    });
  }

  // Activate interrupt card
  const interruptCard = newState.items[cardId];
  if (interruptCard.status === "pending") {
    interruptCard.status = "live";
  }

  newState.currentItemId = cardId;
  effects.push(makeEnterEffect(cardId));

  return { state: newState, effects };
}

/**
 * Finish the current interrupt and restore previous item.
 */
export function endInterrupt(
  state: ShowInstance
): { state: ShowInstance; effects: RuntimeEffect[] } {
  if (!isInInterrupt(state)) {
    return { state, effects: [] };
  }

  const effects: RuntimeEffect[] = [];
  const newState: ShowInstance = {
    ...state,
    items: { ...state.items },
    interruptStack: [...state.interruptStack],
  };

  // End current interrupt card
  const currentId = state.currentItemId;
  const currentCard = currentId ? newState.items[currentId] : null;

  if (currentCard && currentCard.status === "live") {
    currentCard.status = "done";
    effects.push(makeExitEffect(currentId!));
  }

  // Pop previous frame
  const frame = newState.interruptStack.pop();
  if (!frame) {
    newState.currentItemId = undefined;
    return { state: newState, effects };
  }

  const restoredId = frame.itemId;
  const restoredCard = restoredId ? newState.items[restoredId] : null;

  if (restoredCard) {
    if (restoredCard.status === "pending") {
      restoredCard.status = "live";
    }
    newState.currentItemId = restoredId;
    effects.push(makeEnterEffect(restoredId));
  } else {
    newState.currentItemId = undefined;
  }

  return { state: newState, effects };
}
