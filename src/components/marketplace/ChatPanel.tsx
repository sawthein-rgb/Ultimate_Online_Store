import { useEffect, useMemo, useRef, useState } from "react";
import { useMarketplace } from "@/hooks/useMarketplace";
import { Message, OfferData, RoleId, SELLERS, roleById } from "@/lib/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleBadge, roleAccent } from "./RoleSwitcher";
import { OfferDialog, OrderFormDialog, ConfirmedDialog, AddMoreDialog, PaymentDialog } from "./Dialogs";
import { cn } from "@/lib/utils";
import { Clock, Send, Tag, Sparkles } from "lucide-react";
import { toast } from "sonner";

function timeAgo(t: number) {
  const d = Math.floor((Date.now() - t) / 1000);
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
}

export function ChatPanel() {
  const { state, activeRole, sendMessage, acceptOffer, submitOrder, confirmOrder, finishOrder } = useMarketplace();
  const isBuyer = activeRole === "buyer";

  const [text, setText] = useState("");
  const [target, setTarget] = useState<RoleId | "all">("all");
  const [offerOpen, setOfferOpen] = useState(false);
  const [orderForm, setOrderForm] = useState<{ open: boolean; sellerId: RoleId | null; offer: OfferData | null }>({
    open: false, sellerId: null, offer: null,
  });
  const [confirmedOpen, setConfirmedOpen] = useState<string | null>(null);
  const [addMoreOpen, setAddMoreOpen] = useState<string | null>(null);
  const [paymentFor, setPaymentFor] = useState<string | null>(null);
  const seenConfirmed = useRef<Set<string>>(new Set());

  // Watch for orders that just got confirmed → popup for buyer
  useEffect(() => {
    if (!isBuyer) return;
    const justConfirmed = state.orders.find((o) => o.status === "confirmed" && !seenConfirmed.current.has(o.id));
    if (justConfirmed) {
      seenConfirmed.current.add(justConfirmed.id);
      setConfirmedOpen(justConfirmed.id);
    }
  }, [state.orders, isBuyer]);

  // Filter messages relevant to active role
  const visibleMessages = useMemo(() => {
    return state.messages.filter((m) => {
      if (isBuyer) {
        // Buyer sees: their own messages + any message addressed to buyer or to all
        return m.from === "buyer" || m.to === "buyer" || m.to === "all";
      }
      // Seller sees: messages from buyer addressed to them or all, and their own outbound messages
      return (
        m.from === activeRole ||
        (m.from === "buyer" && (m.to === activeRole || m.to === "all"))
      );
    });
  }, [state.messages, activeRole, isBuyer]);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleMessages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage({
      from: activeRole,
      to: isBuyer ? target : "buyer",
      text: text.trim(),
    });
    setText("");
  };

  const handleSendOffer = (offer: OfferData) => {
    sendMessage({
      from: activeRole,
      to: "buyer",
      offer: { ...offer, status: "open", offerId: crypto.randomUUID() },
    });
    toast.success("Offer sent to buyer");
  };

  const handleAccept = (msg: Message) => {
    if (!msg.offer) return;
    acceptOffer(msg.offer.offerId);
    setOrderForm({ open: true, sellerId: msg.from, offer: { title: msg.offer.title, price: msg.offer.price, etaMinutes: msg.offer.etaMinutes, description: msg.offer.description } });
  };

  const handleOrderSubmit = (data: { address: string; phone: string; notes: string }) => {
    if (!orderForm.sellerId || !orderForm.offer) return;
    submitOrder({ sellerId: orderForm.sellerId, offer: orderForm.offer, ...data });
    setOrderForm({ open: false, sellerId: null, offer: null });
    toast.success("Order submitted! Waiting for seller to confirm.");
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl shadow-card border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-secondary/60 to-card flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Chat as</div>
          <div className="font-bold text-lg">{roleById(activeRole).name}</div>
        </div>
        <RoleBadge id={activeRole} size="md" />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {visibleMessages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12">
            No messages yet. Start the conversation 👋
          </div>
        )}
        {visibleMessages.map((m) => {
          const mine = m.from === activeRole;
          return (
            <div key={m.id} className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <RoleBadge id={m.from} />
                {m.to === "all" && <span className="italic">→ broadcast</span>}
                {m.to !== "all" && m.from !== m.to && <span>→ {roleById(m.to).name.split("·")[0].trim()}</span>}
                <span>· {timeAgo(m.createdAt)}</span>
              </div>
              {m.text && (
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    mine ? "rounded-br-sm text-primary-foreground" : "bg-secondary text-secondary-foreground rounded-bl-sm"
                  )}
                  style={mine ? { background: roleAccent[m.from] } : undefined}
                >
                  {m.text}
                </div>
              )}
              {m.offer && (
                <div className="max-w-[85%] w-full bg-card border-2 border-border rounded-2xl p-4 shadow-card" style={{ borderColor: roleAccent[m.from] + "40" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="rounded-full p-1.5" style={{ background: roleAccent[m.from] + "20", color: roleAccent[m.from] }}>
                      <Tag className="w-4 h-4" />
                    </div>
                    <div className="font-bold">{m.offer.title}</div>
                    <div className="ml-auto text-xs px-2 py-0.5 rounded-full bg-secondary capitalize">{m.offer.status}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Price</div>
                      <div className="font-bold text-lg" style={{ color: roleAccent[m.from] }}>RM{m.offer.price.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">ETA</div>
                      <div className="font-semibold flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{m.offer.etaMinutes} min</div>
                    </div>
                  </div>
                  {m.offer.description && <p className="text-sm text-muted-foreground mb-3">{m.offer.description}</p>}
                  {isBuyer && m.offer.status === "open" && (
                    <Button size="sm" className="gradient-warm text-primary-foreground w-full" onClick={() => handleAccept(m)}>
                      <Sparkles className="w-4 h-4 mr-1" /> Accept offer
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-3 space-y-2 bg-gradient-to-b from-card to-secondary/30">
        {isBuyer && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Send to:</span>
            <Select value={target} onValueChange={(v) => setTarget(v as RoleId | "all")}>
              <SelectTrigger className="h-8 w-auto min-w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📢 All sellers (broadcast)</SelectItem>
                {SELLERS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.emoji} {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={isBuyer ? "Ask the sellers what you want to order..." : "Reply to the buyer..."}
          />
          <Button onClick={handleSend} className="gradient-warm text-primary-foreground">
            <Send className="w-4 h-4" />
          </Button>
          {!isBuyer && (
            <Button variant="outline" onClick={() => setOfferOpen(true)}>
              <Tag className="w-4 h-4 mr-1" /> Send offer
            </Button>
          )}
        </div>
      </div>

      <OfferDialog open={offerOpen} onOpenChange={setOfferOpen} onSubmit={handleSendOffer} />
      <OrderFormDialog
        open={orderForm.open}
        onOpenChange={(v) => setOrderForm((p) => ({ ...p, open: v }))}
        sellerId={orderForm.sellerId}
        offer={orderForm.offer}
        onSubmit={handleOrderSubmit}
      />
      <ConfirmedDialog
        open={!!confirmedOpen}
        onOpenChange={(v) => !v && setConfirmedOpen(null)}
        onDone={() => {
          if (confirmedOpen) setPaymentFor(confirmedOpen);
          setConfirmedOpen(null);
        }}
        onAddMore={() => {
          const id = confirmedOpen;
          setConfirmedOpen(null);
          setAddMoreOpen(id);
        }}
      />

      <AddMoreDialog
        open={!!addMoreOpen}
        onOpenChange={(v) => !v && setAddMoreOpen(null)}
      />

      <PaymentDialog
        open={!!paymentFor}
        onOpenChange={(v) => !v && setPaymentFor(null)}
        amount={state.orders.find((o) => o.id === paymentFor)?.offer.price ?? 0}
        itemTitle={state.orders.find((o) => o.id === paymentFor)?.offer.title ?? ""}
        onPaid={() => {
          if (paymentFor) {
            finishOrder(paymentFor);
            toast.success("Payment successful! Order completed 🎉");
          }
          setPaymentFor(null);
        }}
      />
    </div>
  );
}
