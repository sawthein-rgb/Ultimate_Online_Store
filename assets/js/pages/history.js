import {
  getStoreStatus,
  initStore,
  listOffers,
  listOrders,
  listPayments,
  listRequests,
} from "../services/store-service.js";
import {
  escapeHtml,
  formatCurrency,
  formatDateTime,
  formatSizeLabel,
  formatTemperature,
} from "../utils/formatters.js";

const elements = {
  modeBadge: document.querySelector("#history-mode-badge"),
  requestCount: document.querySelector("#request-count"),
  offerCount: document.querySelector("#offer-count"),
  orderCount: document.querySelector("#order-count"),
  paymentCount: document.querySelector("#payment-count"),
  ordersList: document.querySelector("#orders-list"),
  requestsList: document.querySelector("#requests-list"),
  offersList: document.querySelector("#offers-list"),
  paymentsList: document.querySelector("#payments-list"),
};

document.addEventListener("DOMContentLoaded", initializePage);

async function initializePage() {
  await initStore();
  elements.modeBadge.textContent =
    getStoreStatus().mode === "firestore" ? "Firestore live mode" : "Local demo mode";

  const [requests, offers, orders, payments] = await Promise.all([
    listRequests(),
    listOffers(),
    listOrders(),
    listPayments(),
  ]);

  elements.requestCount.textContent = String(requests.length);
  elements.offerCount.textContent = String(offers.length);
  elements.orderCount.textContent = String(orders.length);
  elements.paymentCount.textContent = String(payments.length);

  renderOrders(orders);
  renderRequests(requests);
  renderOffers(offers);
  renderPayments(payments);
}

function renderOrders(orders) {
  if (!orders.length) {
    elements.ordersList.innerHTML =
      '<div class="empty-state">No orders yet. Choose and confirm an offer from the Marketplace page first.</div>';
    return;
  }

  elements.ordersList.innerHTML = orders
    .map((order) => {
      return `
        <article class="history-card">
          <div class="history-top">
            <div>
              <p class="eyebrow">${escapeHtml(order.seller.name)}</p>
              <h3>${escapeHtml(order.product.name)}</h3>
              <p class="meta-line">${escapeHtml(order.query || "Buyer request not recorded.")}</p>
            </div>
            <span class="price-badge">${formatCurrency(order.totalPrice)}</span>
          </div>

          <div class="history-meta">
            <div class="summary-row">
              <span>Buyer</span>
              <strong>${escapeHtml(order.buyer.name)}</strong>
            </div>
            <div class="summary-row">
              <span>Address</span>
              <strong>${escapeHtml(order.buyer.address)}</strong>
            </div>
            <div class="summary-row">
              <span>Quantity</span>
              <strong>${escapeHtml(String(order.quantity))}</strong>
            </div>
            <div class="summary-row">
              <span>Unit price</span>
              <strong>${formatCurrency(order.unitPrice)}</strong>
            </div>
            <div class="summary-row">
              <span>Portion</span>
              <strong>${escapeHtml(formatSizeLabel(order.product))}</strong>
            </div>
            <div class="summary-row">
              <span>Order status</span>
              <strong>${escapeHtml(formatStatusLabel(order.status))}</strong>
            </div>
            <div class="summary-row">
              <span>Payment status</span>
              <strong>${escapeHtml(formatStatusLabel(order.paymentStatus || "pending"))}</strong>
            </div>
            <div class="summary-row">
              <span>Order progress</span>
              <strong>${escapeHtml(formatStatusLabel(order.fulfillmentStatus || "confirmed"))}</strong>
            </div>
            <div class="summary-row">
              <span>Ranking mode</span>
              <strong>${escapeHtml(order.ranking || "best-match")}</strong>
            </div>
            <div class="summary-row">
              <span>Created</span>
              <strong>${escapeHtml(formatDateTime(order.createdAt))}</strong>
            </div>
          </div>

          <div class="pill-row">
            ${(order.badges || []).map((badge) => `<span class="tag">${escapeHtml(badge)}</span>`).join("")}
            ${(order.reasons || []).slice(0, 3).map((reason) => `<span class="meta-chip">${escapeHtml(reason)}</span>`).join("")}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderRequests(requests) {
  if (!requests.length) {
    elements.requestsList.innerHTML =
      '<div class="empty-state">No buyer requests yet. Submit one from the Marketplace page.</div>';
    return;
  }

  elements.requestsList.innerHTML = requests
    .map((request) => {
      return `
        <article class="data-row">
          <div class="history-top">
            <div>
              <p class="eyebrow">Buyer request</p>
              <h3>${escapeHtml(request.query)}</h3>
              <p class="meta-line">${escapeHtml(request.address || "No address recorded")}</p>
            </div>
            <span class="soft-badge">${escapeHtml(formatDateTime(request.createdAt))}</span>
          </div>
          <div class="pill-row">
            <span class="meta-chip">Quantity ${escapeHtml(String(request.quantity || 1))}</span>
            <span class="meta-chip">${escapeHtml(request.budget ? formatCurrency(request.budget) : "No budget limit")}</span>
            <span class="meta-chip">Ranking ${escapeHtml(request.ranking || "best-match")}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderOffers(offers) {
  if (!offers.length) {
    elements.offersList.innerHTML =
      '<div class="empty-state">No seller replies yet. They will appear after a buyer sends a request.</div>';
    return;
  }

  elements.offersList.innerHTML = offers
    .map((offer) => {
      return `
        <article class="data-row">
          <div class="history-top">
            <div>
              <p class="eyebrow">Seller ${escapeHtml(String(offer.seller.marketplaceSlot || "-"))}</p>
              <h3>${escapeHtml(offer.seller.name)}: ${escapeHtml(offer.product.name)}</h3>
              <p class="meta-line">${escapeHtml(offer.replyText || "Seller reply not recorded.")}</p>
            </div>
            <span class="soft-badge">${formatCurrency(offer.totalPrice)}</span>
          </div>

          <div class="pill-row">
            <span class="meta-chip">${escapeHtml(formatTemperature(offer.product.temperature))}</span>
            <span class="meta-chip">${escapeHtml(formatSizeLabel(offer.product))}</span>
            <span class="meta-chip">Qty ${escapeHtml(String(offer.quantity))}</span>
            <span class="meta-chip">${escapeHtml(`${offer.product.prepMinutes || 10} min`)}</span>
          </div>

          <div class="pill-row">
            ${(offer.badges || []).map((badge) => `<span class="tag">${escapeHtml(badge)}</span>`).join("")}
            ${(offer.reasons || []).slice(0, 3).map((reason) => `<span class="meta-chip">${escapeHtml(reason)}</span>`).join("")}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderPayments(payments) {
  if (!payments.length) {
    elements.paymentsList.innerHTML =
      '<div class="empty-state">No payment records yet. Confirm an order from the Marketplace page first.</div>';
    return;
  }

  elements.paymentsList.innerHTML = payments
    .map((payment) => {
      return `
        <article class="data-row">
          <div class="history-top">
            <div>
              <p class="eyebrow">${escapeHtml(payment.sellerName || payment.sellerId || "Payment")}</p>
              <h3>${escapeHtml(payment.id)}</h3>
              <p class="meta-line">Order ${escapeHtml(payment.orderId || "-")} • ${escapeHtml(payment.method || "demo-simulation")}</p>
            </div>
            <span class="soft-badge">${formatCurrency(payment.amount)}</span>
          </div>

          <div class="pill-row">
            <span class="meta-chip">Status ${escapeHtml(formatStatusLabel(payment.status || "pending"))}</span>
            <span class="meta-chip">Updated ${escapeHtml(formatDateTime(payment.updatedAt || payment.createdAt))}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function formatStatusLabel(value) {
  return String(value || "-")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
