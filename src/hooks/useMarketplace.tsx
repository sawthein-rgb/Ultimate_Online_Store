import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  AppState,
  Message,
  OfferData,
  Order,
  ROLES,
  RoleId,
  loadState,
  saveState,
  seed,
} from "@/lib/marketplace";

type Ctx = {
  state: AppState;
  activeRole: RoleId;
  setActiveRole: (r: RoleId) => void;
  unreadByRole: Record<RoleId, number>;
  sendMessage: (msg: Omit<Message, "id" | "createdAt">) => void;
  acceptOffer: (offerId: string) => string;
  submitOrder: (data: { sellerId: RoleId; offer: OfferData; address: string; phone: string; notes: string }) => string;
  confirmOrder: (orderId: string) => void;
  finishOrder: (orderId: string) => void;
  resetAll: () => void;
};

const MarketplaceCtx = createContext<Ctx | null>(null);

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());
  const [activeRole, setActiveRoleState] = useState<RoleId>("buyer");
  const [lastSeen, setLastSeen] = useState<Record<RoleId, number>>(() => {
    const now = Date.now();
    return ROLES.reduce((acc, r) => {
      acc[r.id] = r.id === "buyer" ? now : 0;
      return acc;
    }, {} as Record<RoleId, number>);
  });

  const setActiveRole = useCallback((r: RoleId) => {
    setActiveRoleState(r);
    setLastSeen((prev) => ({ ...prev, [r]: Date.now() }));
  }, []);

  // keep lastSeen for active role fresh as new messages arrive
  useEffect(() => {
    setLastSeen((prev) => ({ ...prev, [activeRole]: Date.now() }));
  }, [activeRole, state.messages.length]);

  const unreadByRole = useMemo(() => {
    const counts = ROLES.reduce((acc, r) => {
      acc[r.id] = 0;
      return acc;
    }, {} as Record<RoleId, number>);
    for (const m of state.messages) {
      for (const r of ROLES) {
        if (r.id === activeRole) continue;
        if (m.from === r.id) continue;
        const addressed = m.to === r.id || m.to === "all" || (r.id === "buyer" && m.to === "buyer");
        if (!addressed) continue;
        if (m.createdAt > (lastSeen[r.id] ?? 0)) counts[r.id] += 1;
      }
    }
    return counts;
  }, [state.messages, lastSeen, activeRole]);

  useEffect(() => saveState(state), [state]);

  const sendMessage: Ctx["sendMessage"] = useCallback((msg) => {
    setState((s) => ({
      ...s,
      messages: [...s.messages, { ...msg, id: crypto.randomUUID(), createdAt: Date.now() }],
    }));
  }, []);

  const acceptOffer: Ctx["acceptOffer"] = useCallback((offerId) => {
    let newId = "";
    setState((s) => {
      const messages = s.messages.map((m) =>
        m.offer && m.offer.offerId === offerId
          ? { ...m, offer: { ...m.offer, status: "accepted" as const } }
          : m
      );
      return { ...s, messages };
    });
    return newId;
  }, []);

  const submitOrder: Ctx["submitOrder"] = useCallback((data) => {
    const order: Order = {
      id: crypto.randomUUID(),
      sellerId: data.sellerId,
      offer: data.offer,
      address: data.address,
      phone: data.phone,
      notes: data.notes,
      status: "pending",
      createdAt: Date.now(),
    };
    setState((s) => ({
      ...s,
      orders: [order, ...s.orders],
      messages: [
        ...s.messages,
        {
          id: crypto.randomUUID(),
          from: "buyer",
          to: data.sellerId,
          text: `📦 Order submitted for "${data.offer.title}" — RM${data.offer.price.toFixed(2)}. Address: ${data.address}.`,
          createdAt: Date.now(),
        },
      ],
    }));
    return order.id;
  }, []);

  const confirmOrder: Ctx["confirmOrder"] = useCallback((orderId) => {
    setState((s) => {
      const order = s.orders.find((o) => o.id === orderId);
      const orders = s.orders.map((o) => (o.id === orderId ? { ...o, status: "confirmed" as const } : o));
      const messages = order
        ? [
            ...s.messages,
            {
              id: crypto.randomUUID(),
              from: order.sellerId,
              to: "buyer" as const,
              text: `✅ Order confirmed! Preparing your "${order.offer.title}" now.`,
              createdAt: Date.now(),
            },
          ]
        : s.messages;
      return { ...s, orders, messages };
    });
  }, []);

  const finishOrder: Ctx["finishOrder"] = useCallback((orderId) => {
    setState((s) => ({
      ...s,
      orders: s.orders.map((o) => (o.id === orderId ? { ...o, status: "done" as const } : o)),
    }));
  }, []);

  const resetAll = useCallback(() => setState(seed()), []);

  const value = useMemo(
    () => ({ state, activeRole, setActiveRole, unreadByRole, sendMessage, acceptOffer, submitOrder, confirmOrder, finishOrder, resetAll }),
    [state, activeRole, setActiveRole, unreadByRole, sendMessage, acceptOffer, submitOrder, confirmOrder, finishOrder, resetAll]
  );

  return <MarketplaceCtx.Provider value={value}>{children}</MarketplaceCtx.Provider>;
}

export function useMarketplace() {
  const ctx = useContext(MarketplaceCtx);
  if (!ctx) throw new Error("useMarketplace must be inside MarketplaceProvider");
  return ctx;
}
