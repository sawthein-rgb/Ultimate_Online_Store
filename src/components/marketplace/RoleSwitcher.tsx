import { ROLES, RoleId } from "@/lib/marketplace";
import { cn } from "@/lib/utils";

const toneBg: Record<RoleId, string> = {
  buyer: "bg-buyer text-buyer-foreground",
  "seller-1": "bg-[hsl(var(--seller-1))] text-white",
  "seller-2": "bg-[hsl(var(--seller-2))] text-white",
  "seller-3": "bg-[hsl(var(--seller-3))] text-white",
};

const toneRing: Record<RoleId, string> = {
  buyer: "ring-buyer",
  "seller-1": "ring-[hsl(var(--seller-1))]",
  "seller-2": "ring-[hsl(var(--seller-2))]",
  "seller-3": "ring-[hsl(var(--seller-3))]",
};

export function RoleSwitcher({
  active,
  onChange,
  unreadByRole,
}: {
  active: RoleId;
  onChange: (r: RoleId) => void;
  unreadByRole?: Record<RoleId, number>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ROLES.map((r) => {
        const isActive = r.id === active;
        const unread = unreadByRole?.[r.id] ?? 0;
        return (
          <button
            key={r.id}
            onClick={() => onChange(r.id)}
            className={cn(
              "relative px-3 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2",
              isActive ? cn(toneBg[r.id], "shadow-card scale-[1.02] ring-2 ring-offset-2 ring-offset-background", toneRing[r.id]) : "bg-secondary text-secondary-foreground hover:bg-muted"
            )}
          >
            <span className="relative inline-flex">
              <span>{r.emoji}</span>
              {unread > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background animate-in zoom-in">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </span>
            <span className="hidden sm:inline">{r.name}</span>
            <span className="sm:hidden">{r.id === "buyer" ? "Buyer" : r.name.split("·")[0].trim()}</span>
          </button>
        );
      })}
    </div>
  );
}

export function RoleBadge({ id, size = "sm" }: { id: RoleId; size?: "sm" | "md" }) {
  const role = ROLES.find((r) => r.id === id)!;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold",
        toneBg[id],
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      <span>{role.emoji}</span>
      <span>{role.name.split("·")[0].trim()}</span>
    </span>
  );
}

export const roleAccent: Record<RoleId, string> = {
  buyer: "hsl(var(--buyer))",
  "seller-1": "hsl(var(--seller-1))",
  "seller-2": "hsl(var(--seller-2))",
  "seller-3": "hsl(var(--seller-3))",
};
