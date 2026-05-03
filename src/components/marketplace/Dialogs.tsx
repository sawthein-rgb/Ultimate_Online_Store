import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { OfferData, RoleId } from "@/lib/marketplace";

export function OfferDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (offer: OfferData) => void;
}) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [eta, setEta] = useState("");
  const [desc, setDesc] = useState("");

  const submit = () => {
    if (!title || !price) return;
    onSubmit({
      title,
      price: parseFloat(price) || 0,
      etaMinutes: parseInt(eta) || 30,
      description: desc,
    });
    setTitle(""); setPrice(""); setEta(""); setDesc("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send an offer</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Offer title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Nasi Lemak Special" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price (RM)</Label>
              <Input type="number" step="0.5" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="12.00" />
            </div>
            <div>
              <Label>ETA (minutes)</Label>
              <Input type="number" value={eta} onChange={(e) => setEta(e.target.value)} placeholder="30" />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Includes ayam goreng, sambal, telur..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} className="gradient-warm text-primary-foreground">Send offer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OrderFormDialog({
  open,
  onOpenChange,
  sellerId,
  offer,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sellerId: RoleId | null;
  offer: OfferData | null;
  onSubmit: (data: { address: string; phone: string; notes: string }) => void;
}) {
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!address || !phone) return;
    onSubmit({ address, phone, notes });
    setAddress(""); setPhone(""); setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete your order</DialogTitle>
        </DialogHeader>
        {offer && (
          <div className="rounded-lg bg-secondary p-3 text-sm">
            <div className="font-semibold">{offer.title}</div>
            <div className="text-muted-foreground">RM{offer.price.toFixed(2)} · ETA {offer.etaMinutes} min</div>
          </div>
        )}
        <div className="space-y-3">
          <div>
            <Label>Delivery address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="No. 12, Jalan Sentral..." />
          </div>
          <div>
            <Label>Phone number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="012-345 6789" />
          </div>
          <div>
            <Label>Additional notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Less spicy please" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} className="gradient-warm text-primary-foreground">Submit order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmedDialog({
  open,
  onOpenChange,
  onDone,
  onAddMore,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
  onAddMore: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>🎉 Seller confirmed your order!</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">What would you like to do next?</p>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onAddMore}>Add more</Button>
          <Button onClick={onDone} className="gradient-warm text-primary-foreground">Done · Go to payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AddMoreDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>🛍️ Add more items</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          Keep chatting with sellers to add more items to your basket.
        </p>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button onClick={() => onOpenChange(false)} className="gradient-warm text-primary-foreground">Keep shopping</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentDialog({
  open,
  onOpenChange,
  amount,
  itemTitle,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  amount: number;
  itemTitle: string;
  onPaid: () => void;
}) {
  const [method, setMethod] = useState<"card" | "fpx" | "ewallet">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [processing, setProcessing] = useState(false);

  const pay = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setCardNumber(""); setExpiry(""); setCvc("");
      onPaid();
    }, 900);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>💳 Payment</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg gradient-warm text-primary-foreground p-4">
          <div className="text-xs opacity-80 uppercase tracking-wider">Total to pay</div>
          <div className="text-3xl font-extrabold">RM{amount.toFixed(2)}</div>
          <div className="text-xs opacity-90 mt-1 truncate">for {itemTitle}</div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(["card", "fpx", "ewallet"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`rounded-lg border-2 p-2 text-xs font-semibold capitalize transition-all ${
                method === m ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
              }`}
            >
              {m === "card" ? "💳 Card" : m === "fpx" ? "🏦 FPX" : "📱 e-Wallet"}
            </button>
          ))}
        </div>

        {method === "card" && (
          <div className="space-y-3">
            <div>
              <Label>Card number</Label>
              <Input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="4242 4242 4242 4242" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Expiry</Label>
                <Input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="MM/YY" />
              </div>
              <div>
                <Label>CVC</Label>
                <Input value={cvc} onChange={(e) => setCvc(e.target.value)} placeholder="123" />
              </div>
            </div>
          </div>
        )}
        {method === "fpx" && (
          <div className="text-sm text-muted-foreground rounded-lg bg-secondary p-3">
            You'll be redirected to your bank to authorise the payment (mock).
          </div>
        )}
        {method === "ewallet" && (
          <div className="text-sm text-muted-foreground rounded-lg bg-secondary p-3">
            Scan the QR with Touch 'n Go / GrabPay / Boost (mock).
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={processing}>Cancel</Button>
          <Button onClick={pay} disabled={processing} className="gradient-warm text-primary-foreground">
            {processing ? "Processing…" : `Pay RM${amount.toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
