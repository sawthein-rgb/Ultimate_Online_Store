export type RoleId = "buyer" | "seller-1" | "seller-2" | "seller-3";

export const ROLES: { id: RoleId; name: string; emoji: string; tone: string }[] = [
  { id: "buyer", name: "Buyer", emoji: "🛒", tone: "buyer" },
  { id: "seller-1", name: "Seller 1 · Nasi Lemak Mak Cik", emoji: "🍚", tone: "seller-1" },
  { id: "seller-2", name: "Seller 2 · Burger Bakar Bro", emoji: "🍔", tone: "seller-2" },
  { id: "seller-3", name: "Seller 3 · Kuih & Kopi Corner", emoji: "🥐", tone: "seller-3" },
];

export const SELLERS = ROLES.filter((r) => r.id !== "buyer");

export type OfferData = {
  title: string;
  price: number;
  etaMinutes: number;
  description: string;
};

export type Message = {
  id: string;
  from: RoleId;
  to: RoleId | "all";
  text?: string;
  offer?: OfferData & {
    status: "open" | "accepted" | "declined";
    offerId: string;
  };
  createdAt: number;
};

export type OrderStatus = "pending" | "confirmed" | "done";

export type Order = {
  id: string;
  sellerId: RoleId;
  offer: OfferData;
  address: string;
  phone: string;
  notes: string;
  status: OrderStatus;
  createdAt: number;
};

export type AppState = {
  messages: Message[];
  orders: Order[];
};

const STORAGE_KEY = "makanapa-state-v1";

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seed();
}

export function saveState(s: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function seed(): AppState {
  const now = Date.now();
  return {
    messages: [
      {
        id: crypto.randomUUID(),
        from: "buyer",
        to: "all",
        text: "Hi all! Looking for lunch around RM15. Anyone available to deliver to Cyberjaya in the next hour?",
        createdAt: now - 1000 * 60 * 4,
      },
    ],
    orders: [],
  };
}

export const roleById = (id: RoleId) => ROLES.find((r) => r.id === id)!;
