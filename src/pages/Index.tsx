import { MarketplaceProvider, useMarketplace } from "@/hooks/useMarketplace";
import { ChatPanel } from "@/components/marketplace/ChatPanel";
import { OrdersPanel } from "@/components/marketplace/OrdersPanel";
import { RoleSwitcher } from "@/components/marketplace/RoleSwitcher";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, RotateCcw, Utensils } from "lucide-react";

function Shell() {
  const { activeRole, setActiveRole, resetAll, unreadByRole } = useMarketplace();
  const { signOut, name } = useAuth();
  return (
    <div className="min-h-screen gradient-soft">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="container py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-warm flex items-center justify-center text-primary-foreground shadow-card">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold leading-tight">MakanApa Marketplace</h1>
              <p className="text-xs text-muted-foreground">
                {name ? `Hey, ${name} · ` : ""}Buyer ↔ 3 Sellers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RoleSwitcher active={activeRole} onChange={setActiveRole} unreadByRole={unreadByRole} />
            <Button variant="ghost" size="icon" onClick={resetAll} title="Reset demo data">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <div className="grid lg:grid-cols-[1fr_360px] gap-4 h-[calc(100vh-9rem)] min-h-[600px]">
          <ChatPanel />
          <OrdersPanel />
        </div>
      </main>
    </div>
  );
}

const Index = () => (
  <MarketplaceProvider>
    <Shell />
  </MarketplaceProvider>
);

export default Index;
