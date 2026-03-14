import type { OverlayRuntimePacketV1 } from "@scraplet/contracts/overlayRuntime";

function resolveRuntimePacketUrl() {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "https://scraplet.store/dashboard/api/runtime/packets";
  }
  return "/dashboard/api/runtime/packets";
}

export async function sendComponentPacket(packet: OverlayRuntimePacketV1) {
  const res = await fetch(resolveRuntimePacketUrl(), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(packet),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`runtime packet HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }

  return res.json().catch(() => ({ ok: true }));
}
