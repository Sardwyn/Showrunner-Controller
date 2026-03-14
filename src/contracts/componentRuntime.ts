export type OverlayRuntimePacketVersion = "1";

export interface NativeComponentAddressV1 {
  kind: "native";
  tenantId?: string;
  overlayPublicId: string;
  componentInstanceId: string;
}

export interface WidgetAdapterAddressV1 {
  kind: "widget";
  tenantId?: string;
  overlayPublicId: string;
  widgetType: string;
  widgetId: string;
}

export type ComponentAddressV1 =
  | NativeComponentAddressV1
  | WidgetAdapterAddressV1;

export type ComponentOperationV1 =
  | "show"
  | "hide"
  | "setProp"
  | "setState"
  | "dispatch";

export interface OverlayRuntimePacketScopeV1 {
  tenantId: string;
  overlayPublicId: string;
  componentInstanceId?: string;
}

export interface OverlayRuntimePacketV1<TPayload = Record<string, any>> {
  header: {
    version: OverlayRuntimePacketVersion;
    id: string;
    type: string;
    ts: number;
    producer: string;
    platform: string;
    scope: OverlayRuntimePacketScopeV1;
  };
  payload: TPayload;
}

function safeJsonParse(input: string | undefined, fallback: any) {
  const value = String(input || "").trim();
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function buildComponentRuntimePacket(input: {
  address: ComponentAddressV1;
  operation: ComponentOperationV1;
  producer?: string;
  platform?: string;
  patchText?: string;
  event?: string;
  dataText?: string;
}): OverlayRuntimePacketV1 {
  const producer = input.producer || "studio-controller";
  const platform = input.platform || "internal";
  const tenantId = String(input.address.tenantId || "");

  if (!tenantId) {
    throw new Error("Component target is missing tenantId");
  }

  const scope: OverlayRuntimePacketScopeV1 = {
    tenantId,
    overlayPublicId: input.address.overlayPublicId,
    componentInstanceId:
      input.address.kind === "native" ? input.address.componentInstanceId : undefined,
  };

  let type = "component.show";
  let payload: Record<string, any> = {};

  if (input.operation === "hide") {
    type = "component.hide";
  } else if (input.operation === "setProp") {
    type = "component.setProp";
    payload = { patch: safeJsonParse(input.patchText, {}) };
  } else if (input.operation === "setState") {
    type = "component.setState";
    payload = { patch: safeJsonParse(input.patchText, {}) };
  } else if (input.operation === "dispatch") {
    type = "component.dispatch";
    payload = {
      event: String(input.event || "").trim(),
      data: safeJsonParse(input.dataText, {}),
    };
  }

  return {
    header: {
      version: "1",
      id: `ctrl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      ts: Date.now(),
      producer,
      platform,
      scope,
    },
    payload,
  };
}
