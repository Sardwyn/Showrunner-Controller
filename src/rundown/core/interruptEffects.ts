import {
  ExecuteEnterActionsEffect,
  ExecuteExitActionsEffect,
} from "./types";

export function makeEnterEffect(
  itemId: string
): ExecuteEnterActionsEffect {
  return {
    type: "EXECUTE_ENTER_ACTIONS",
    payload: { itemId },
  };
}

export function makeExitEffect(
  itemId: string
): ExecuteExitActionsEffect {
  return {
    type: "EXECUTE_EXIT_ACTIONS",
    payload: { itemId },
  };
}
