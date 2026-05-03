import { useMarketplace } from "@/hooks/useMarketplace";
import { roleById } from "@/lib/marketplace";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const statusStyles = {
  pending: "bg-status-pending/15 text-status-pending border-status-pending/30",
  confirmed: "bg-status-confirmed/15 text-status-confirmed border-status-confirmed/30",
  done: "bg-status-done/15 text-status-done border-status-done/30",
} as const;

const statusIcon = {
  pending: Clock,
  confirmed: Package,
  done: CheckCircle2,
} as const;

export function OrdersPanel() {
  const { state, activeRole, confirmOrder } = useMarketplace();
  const isBuyer = activeRole === "buyer";

  const orders = state.orders.filter((o) => isBuyer || o.sellerId === activeRole);

  return (
    <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-secondary/60 to-card">
        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {isBuyer ? "Your orders" : "Incoming orders"}
        </div>
        <div className="font-bold text-lg">Order history</div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {orders.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12 px-4">
            {isBuyer
              ? "Accept an offer in chat to start your first order."
              : "No orders yet. Send an offer to the buyer to get started."}
          </div>
        )}
        {orders.map((o) => {
          const Icon = statusIcon[o.status];
          const seller = roleById(o.sellerId);
          return (
            <div key={o.id} className="border border-border rounded-xl p-3 hover:shadow-card transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-bold">{o.offer.title}</div>
                  <div className="text-xs text-muted-foreground">{seller.name}</div>
                </div>
                <span className={cn("text-xs px-2 py-1 rounded-full border font-semibold capitalize flex items-center gap-1", statusStyles[o.status])}>
                  <Icon className="w-3 h-3" /> {o.status}
                </span>
              </div>
              <div className="text-sm space-y-0.5 text-muted-foreground">
                <div>RM{o.offer.price.toFixed(2)} · {o.offer.etaMinutes} min</div>
                <div className="truncate">📍 {o.address}</div>
                <div>📞 {o.phone}</div>
                {o.notes && <div className="italic">"{o.notes}"</div>}
              </div>
              {!isBuyer && o.status === "pending" && (
                <Button size="sm" className="w-full mt-3 gradient-warm text-primary-foreground" onClick={() => confirmOrder(o.id)}>
                  Confirm order
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
