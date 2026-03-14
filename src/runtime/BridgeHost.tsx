import { useScrapbotBridge } from "./useScrapbotBridge";
import { useRundownEventBridge } from "./useRundownEventBridge";

export function BridgeHost() {
  useScrapbotBridge();
  useRundownEventBridge();
  return null; // renders nothing, just wires the bridges
}
