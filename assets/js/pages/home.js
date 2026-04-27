import {
  createOrder,
  createRequestRecord,
  initStore,
  listOffers,
  listOrders,
  listProducts,
  listRequests,
  listSellers,
  saveOfferRecords,
  subscribeToCollectionChanges,
  updateOrderFulfillmentStatus,
  updateOrderPaymentStatus,
} from "../services/store-service.js";
import {
  addChatMessage,
  ensureChatThread,
  getChatThread,
  listThreadMessages,
  setSelectedSellerForChat,
  subscribeToChatChanges,
  syncOfferMessages,
} from "../services/chat-service.js";
import { renderRouteMap } from "../services/map-service.js";
import {
  addNotification,
  countUnreadNotifications,
  listNotifications,
  markNotificationsAsRead,
  subscribeToNotificationChanges,
} from "../services/notification-service.js";
import {
  buildMarketplaceOffers,
  buildRequestSummary,
  parseBuyerRequest,
} from "../services/recommendation-service.js";
import {
  escapeHtml,
  formatCurrency,
  formatDateTime,
  formatSizeLabel,
  formatTemperature,
} from "../utils/formatters.js";

const TAB_LABELS = {
  "buyer-panel": "Buyer",
  "seller-panel-1": "Seller 1",
  "seller-panel-2": "Seller 2",
  "seller-panel-3": "Seller 3",
};
const FULFILLMENT_STEPS = ["confirmed", "cooking", "on-the-way", "arrived"];

const state = {
  products: [],
  sellers: [],
  activeTab: "buyer-panel",
  currentRequest: null,
  parsedRequest: null,
  offers: [],
  rankedOffers: [],
  selectedOffer: null,
  currentOrder: null,
};

function isOrderCompleted(order) {
  return order?.fulfillmentStatus === "arrived";
}

function hasActiveOrder() {
  return Boolean(state.currentOrder && !isOrderCompleted(state.currentOrder));
}

const elements = {
  modeBadge: document.querySelector("#store-mode-badge"),
  activeRequestBadge: document.querySelector("#active-request-badge"),
  roleTabs: document.querySelector("#role-tabs"),
  panels: [...document.querySelectorAll(".tab-panel")],
  marketplaceThread: document.querySelector("#buyer-marketplace-thread"),
  marketplaceEmptyState: document.querySelector("#buyer-marketplace-empty-state"),
  requestForm: document.querySelector("#buyer-request-form"),
  queryInput: document.querySelector("#buyer-query"),
  quantityInput: document.querySelector("#buyer-quantity"),
  budgetInput: document.querySelector("#buyer-budget"),
  addressInput: document.querySelector("#buyer-address"),
  rankingInput: document.querySelector("#buyer-ranking"),
  requestStatus: document.querySelector("#request-status"),
  buyerDirectForm: document.querySelector("#buyer-direct-chat-form"),
  buyerDirectSeller: document.querySelector("#buyer-direct-seller"),
  buyerDirectPrice: document.querySelector("#buyer-direct-price"),
  buyerDirectMessage: document.querySelector("#buyer-direct-message"),
  buyerDirectStatus: document.querySelector("#buyer-direct-status"),
  requestEmptyState: document.querySelector("#request-empty-state"),
  requestSummaryCard: document.querySelector("#request-summary-card"),
  requestSummaryTitle: document.querySelector("#request-summary-title"),
  requestSummaryText: document.querySelector("#request-summary-text"),
  requestSummaryPills: document.querySelector("#request-summary-pills"),
  offersEmptyState: document.querySelector("#offers-empty-state"),
  offerCountLabel: document.querySelector("#offer-count-label"),
  offerGrid: document.querySelector("#buyer-offer-grid"),
  buyerChatEmptyState: document.querySelector("#buyer-chat-empty-state"),
  buyerChatGrid: document.querySelector("#buyer-chat-grid"),
  buyerChatScopeLabel: document.querySelector("#buyer-chat-scope-label"),
  buyerNotificationEmptyState: document.querySelector("#buyer-notifications-empty-state"),
  buyerNotificationList: document.querySelector("#buyer-notifications-list"),
  buyerNotificationCountLabel: document.querySelector("#buyer-notification-count-label"),
  selectedOfferEmptyState: document.querySelector("#selected-offer-empty-state"),
  selectedOfferPanel: document.querySelector("#selected-offer-panel"),
  selectedOfferSellerLabel: document.querySelector("#selected-offer-seller-label"),
  selectedOfferProductName: document.querySelector("#selected-offer-product-name"),
  selectedOfferReply: document.querySelector("#selected-offer-reply"),
  selectedOfferTotal: document.querySelector("#selected-offer-total"),
  selectedOfferUnitPrice: document.querySelector("#selected-offer-unit-price"),
  selectedOfferQuantity: document.querySelector("#selected-offer-quantity"),
  selectedOfferAddress: document.querySelector("#selected-offer-address"),
  selectedOfferContact: document.querySelector("#selected-offer-contact"),
  selectedOfferBadges: document.querySelector("#selected-offer-badges"),
  confirmForm: document.querySelector("#confirm-order-form"),
  confirmBuyerName: document.querySelector("#confirm-buyer-name"),
  confirmBuyerPhone: document.querySelector("#confirm-buyer-phone"),
  confirmOrderButton: document.querySelector("#confirm-order-button"),
  confirmStatus: document.querySelector("#confirm-status"),
  buyerMapEmptyState: document.querySelector("#buyer-map-empty-state"),
  buyerMapPanel: document.querySelector("#buyer-map-panel"),
  buyerMapDistance: document.querySelector("#buyer-map-distance"),
  buyerRouteMeta: document.querySelector("#buyer-route-meta"),
  buyerRouteMap: document.querySelector("#buyer-route-map"),
  buyerRouteLink: document.querySelector("#buyer-route-link"),
  paymentEmptyState: document.querySelector("#payment-empty-state"),
  paymentPanel: document.querySelector("#payment-panel"),
  paymentOrderLabel: document.querySelector("#payment-order-label"),
  paymentOrderTitle: document.querySelector("#payment-order-title"),
  paymentOrderMeta: document.querySelector("#payment-order-meta"),
  paymentAmount: document.querySelector("#payment-amount"),
  paymentOrderStatus: document.querySelector("#payment-order-status"),
  paymentStatusBadge: document.querySelector("#payment-status-badge"),
  fulfillmentStatusBadge: document.querySelector("#fulfillment-status-badge"),
  fulfillmentSteps: document.querySelector("#fulfillment-steps"),
  paymentUpdatedAt: document.querySelector("#payment-updated-at"),
  paymentActions: document.querySelector("#payment-actions"),
  paymentStatusText: document.querySelector("#payment-status-text"),
  sellerCards: {
    1: document.querySelector("#seller-card-1"),
    2: document.querySelector("#seller-card-2"),
    3: document.querySelector("#seller-card-3"),
  },
};

document.addEventListener("DOMContentLoaded", initializePage);

async function initializePage() {
  const status = await initStore();
  elements.modeBadge.textContent =
    status.mode === "firestore" ? "Firestore live mode" : "Local demo mode";

  const [products, sellers, requests, offers, orders] = await Promise.all([
    listProducts(),
    listSellers(),
    listRequests(),
    listOffers(),
    listOrders(),
  ]);

  state.products = products;
  state.sellers = sellers;

  attachEventListeners();
  renderNotificationBadges();
  renderBuyerNotifications();
  renderInitialSellerTabs();
  restoreLatestMarketplaceState(requests, offers, orders);
  subscribeToChatChanges(handleChatStoreChange);
  subscribeToNotificationChanges(handleNotificationChange);
  await subscribeToCollectionChanges("orders", handleOrderCollectionChange);
}

function attachEventListeners() {
  elements.roleTabs.addEventListener("click", handleTabClick);
  elements.requestForm.addEventListener("submit", handleRequestSubmit);
  elements.offerGrid.addEventListener("click", handleOfferGridClick);
  elements.marketplaceThread.addEventListener("click", handleBuyerThreadClick);
  elements.confirmForm.addEventListener("submit", handleConfirmSubmit);
  elements.buyerDirectForm.addEventListener("submit", handleBuyerDirectSubmit);
  elements.paymentActions.addEventListener("click", handlePaymentActionClick);
  document.addEventListener("submit", handleDynamicSubmit);
  document.addEventListener("click", handleDynamicClick);
  elements.addressInput.addEventListener("input", handleAddressChange);

  document.querySelectorAll("[data-example]").forEach((button) => {
    button.addEventListener("click", () => {
      elements.queryInput.value = button.dataset.example || "";
      elements.requestForm.requestSubmit();
    });
  });
}

function handleTabClick(event) {
  const button = event.target.closest("[data-tab-target]");
  if (!button) {
    return;
  }

  switchTab(button.getAttribute("data-tab-target"));
}

function switchTab(panelId) {
  state.activeTab = panelId;

  document.querySelectorAll(".role-tab").forEach((button) => {
    button.classList.toggle("is-active", button.getAttribute("data-tab-target") === panelId);
  });

  elements.panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === panelId);
  });

  markNotificationsForPanel(panelId);
  renderNotificationBadges();
  renderBuyerNotifications();
  renderSellerNotificationLists();
}

function markNotificationsForPanel(panelId) {
  if (panelId === "buyer-panel") {
    markNotificationsAsRead({ audienceType: "buyer" });
    return;
  }

  if (!panelId.startsWith("seller-panel-")) {
    return;
  }

  const slot = Number(panelId.replace("seller-panel-", ""));
  const seller = getMarketplaceSellers().find((item) => Number(item.marketplaceSlot) === slot);

  if (seller) {
    markNotificationsAsRead({
      audienceType: "seller",
      sellerId: seller.id,
    });
  }
}

function handleAddressChange() {
  if (!state.currentRequest) {
    return;
  }

  state.currentRequest = {
    ...state.currentRequest,
    address: getCurrentBuyerAddress(),
  };

  renderRequestSummary();
  renderSelectedOffer();
  renderBuyerMap();
  renderSellerMaps();
}

function handleDynamicSubmit(event) {
  const revisionForm = event.target.closest("[data-revision-form]");
  if (revisionForm) {
    event.preventDefault();
    handleSellerRevisionSubmit(revisionForm);
    return;
  }

  const chatForm = event.target.closest("[data-chat-form]");
  if (!chatForm) {
    return;
  }

  event.preventDefault();
  handleChatFormSubmit(chatForm);
}

function handleDynamicClick(event) {
  const statusButton = event.target.closest("[data-fulfillment-action]");
  if (statusButton) {
    handleSellerFulfillmentAction(statusButton);
  }
}

function handleChatStoreChange() {
  if (!state.currentRequest) {
    return;
  }

  const nextSelectedOffer = state.selectedOffer
    ? getEffectiveOfferBySellerId(state.selectedOffer.seller.id)
    : null;

  if (
    nextSelectedOffer?.seller?.id !== state.selectedOffer?.seller?.id ||
    nextSelectedOffer?.revisionMessageId !== state.selectedOffer?.revisionMessageId
  ) {
    state.selectedOffer = nextSelectedOffer || null;
    renderSelectedOffer();
    renderSellerTabs();
    renderBuyerMap();
  }

  renderBuyerMarketplaceThread();
  renderSellerChatThreads();
}

function handleNotificationChange() {
  renderNotificationBadges();
  renderBuyerNotifications();
  renderSellerNotificationLists();
}

function handleOrderCollectionChange(orders) {
  if (!Array.isArray(orders)) {
    return;
  }

  const matchingOrder = state.currentOrder
    ? orders.find((order) => order.id === state.currentOrder.id) || null
    : null;
  const latestActiveOrder = orders.find((order) => !isOrderCompleted(order)) || null;

  if (matchingOrder && isOrderCompleted(matchingOrder)) {
    completeCurrentOrderAndReset(matchingOrder);
    return;
  }

  state.currentOrder = matchingOrder || latestActiveOrder;

  renderBuyerMarketplaceThread();
  renderBuyerDirectComposer();
  renderPaymentPanel();
  renderSellerTabs();
}

function renderInitialSellerTabs() {
  const marketplaceSellers = getMarketplaceSellers();

  for (const slot of [1, 2, 3]) {
    const seller = marketplaceSellers[slot - 1];
    elements.sellerCards[slot].innerHTML = renderSellerCardSkeleton(slot, seller);
  }
}

function getMarketplaceSellers() {
  return [...state.sellers]
    .sort((left, right) => {
      const leftSlot = Number(left.marketplaceSlot || 999);
      const rightSlot = Number(right.marketplaceSlot || 999);
      return leftSlot - rightSlot || String(left.name).localeCompare(String(right.name));
    })
    .slice(0, 3)
    .map((seller, index) => ({
      ...seller,
      marketplaceSlot: Number(seller.marketplaceSlot) || index + 1,
    }));
}

function getCurrentBuyerAddress() {
  return elements.addressInput.value.trim() || state.currentRequest?.address || "";
}

function getCurrentChatThread() {
  return state.currentRequest ? getChatThread(state.currentRequest.id) : null;
}

function getSelectedChatSellerId() {
  return getCurrentChatThread()?.selectedSellerId || null;
}

function getBaseOfferBySellerId(sellerId) {
  return state.offers.find((offer) => offer.seller.id === sellerId) || null;
}

function buildEffectiveOffer(offer) {
  if (!offer || !state.currentRequest) {
    return offer;
  }

  const revisions = listThreadMessages(state.currentRequest.id, offer.seller.id).filter(
    (message) => message.metadata?.kind === "offer-revision"
  );

  if (!revisions.length) {
    return offer;
  }

  const latestRevision = revisions[revisions.length - 1];
  const snapshot = latestRevision.metadata?.offerSnapshot || {};

  return {
    ...offer,
    unitPrice: Number(snapshot.unitPrice) || Number(offer.unitPrice) || 0,
    totalPrice: Number(snapshot.totalPrice) || Number(offer.totalPrice) || 0,
    quantity: Number(snapshot.quantity) || Number(offer.quantity) || 1,
    replyText: snapshot.replyText || latestRevision.text || offer.replyText,
    badges: snapshot.badges || offer.badges || [],
    reasons: snapshot.reasons || offer.reasons || [],
    revisionMessageId: latestRevision.id,
    revisedAt: latestRevision.createdAt,
  };
}

function getEffectiveOfferBySellerId(sellerId) {
  const offer = getBaseOfferBySellerId(sellerId);
  return offer ? buildEffectiveOffer(offer) : null;
}

function getEffectiveRankedOffers() {
  return state.rankedOffers.map((offer) => buildEffectiveOffer(offer));
}

function buildNormalizedRequest() {
  const query = elements.queryInput.value.trim();
  const parsedRequest = parseBuyerRequest(query);
  const quantity = Math.max(1, Number(elements.quantityInput.value) || parsedRequest.quantity || 1);
  const budget = Number(elements.budgetInput.value) || parsedRequest.maxPrice || null;
  const requestedRanking = elements.rankingInput.value;
  const ranking = requestedRanking === "auto" ? parsedRequest.ranking : requestedRanking;

  return {
    query,
    parsedRequest: {
      ...parsedRequest,
      quantity,
      maxPrice: budget,
      ranking,
    },
  };
}

function restoreLatestMarketplaceState(requests, offers, orders) {
  const latestActiveOrder = orders.find((order) => !isOrderCompleted(order)) || null;
  const latestOpenRequest = requests.find((request) => !request.resolved) || null;
  const latestTrackedRequest =
    latestOpenRequest ||
    (latestActiveOrder
      ? requests.find((request) => request.id === latestActiveOrder.requestId) || null
      : null);

  state.currentOrder = latestActiveOrder;

  if (latestTrackedRequest) {
    const relatedOffers = offers.filter((offer) => offer.requestId === latestTrackedRequest.id);

    hydrateMarketplaceState({
      requestRecord: latestTrackedRequest,
      savedOffers: relatedOffers,
      currentOrder: latestActiveOrder,
    });
    return;
  }

  clearRequestWorkflowState();
  elements.activeRequestBadge.textContent = orders.length
    ? "Ready for next request"
    : "No request yet";
  renderMarketplaceState();
}

function hydrateMarketplaceState({ requestRecord, savedOffers, currentOrder = null }) {
  if (!requestRecord) {
    return;
  }

  const parsedRequest = {
    ...parseBuyerRequest(requestRecord.query),
    ...(requestRecord.parsedRequest || {}),
    quantity: Number(requestRecord.quantity) || Number(requestRecord.parsedRequest?.quantity) || 1,
    maxPrice: Number(requestRecord.budget) || Number(requestRecord.parsedRequest?.maxPrice) || null,
    ranking: requestRecord.ranking || requestRecord.parsedRequest?.ranking || "best-match",
  };
  const offerResult = buildMarketplaceOffers(state.products, state.sellers, parsedRequest, 3);
  const savedOfferMap = new Map(savedOffers.map((offer) => [offer.seller.id, offer]));

  state.currentRequest = {
    ...requestRecord,
    parsedRequest,
  };
  state.parsedRequest = parsedRequest;
  state.offers = offerResult.offers.map((offer) => savedOfferMap.get(offer.seller.id) || offer);
  state.rankedOffers = offerResult.rankedOffers.map(
    (offer) => savedOfferMap.get(offer.seller.id) || offer
  );
  state.currentOrder = currentOrder || state.currentOrder;

  if (!getChatThread(requestRecord.id)) {
    ensureChatThread({
      requestId: requestRecord.id,
      sellerIds: state.offers.map((offer) => offer.seller.id),
    });
  }
  syncOfferMessages({
    requestId: requestRecord.id,
    offers: state.offers,
  });

  state.selectedOffer =
    currentOrder && currentOrder.seller?.id
      ? getEffectiveOfferBySellerId(currentOrder.seller.id)
      : null;

  elements.queryInput.value = requestRecord.query || "";
  elements.quantityInput.value = String(parsedRequest.quantity || 1);
  elements.budgetInput.value = requestRecord.budget || parsedRequest.maxPrice || "";
  elements.addressInput.value = requestRecord.address || "";
  elements.rankingInput.value = parsedRequest.ranking || "best-match";

  elements.activeRequestBadge.textContent =
    currentOrder && !isOrderCompleted(currentOrder)
      ? `Order in progress: ${requestRecord.query}`
      : `Latest request: ${requestRecord.query}`;

  renderMarketplaceState();
}

function clearRequestWorkflowState() {
  state.currentRequest = null;
  state.parsedRequest = null;
  state.offers = [];
  state.rankedOffers = [];
  state.selectedOffer = null;
}

function resetRequestForm() {
  elements.queryInput.value = "";
  elements.quantityInput.value = "1";
  elements.budgetInput.value = "";
  elements.addressInput.value = "";
  elements.rankingInput.value = "auto";
}

function resetMarketplaceForNextRequest() {
  clearRequestWorkflowState();
  state.currentOrder = null;
  resetRequestForm();
  elements.buyerDirectSeller.innerHTML = '<option value="">Choose a seller first</option>';
  elements.buyerDirectSeller.value = "";
  elements.buyerDirectPrice.value = "";
  elements.buyerDirectMessage.value = "";
  elements.activeRequestBadge.textContent = "Ready for next request";
  elements.requestStatus.textContent =
    "The marketplace is ready for the next buyer request.";
  elements.buyerDirectStatus.textContent =
    "Use this to negotiate with one seller after the offers appear.";
  elements.paymentStatusText.textContent =
    "Payment changes update the order record and payment record together.";
  renderMarketplaceState();
}

function completeCurrentOrderAndReset(order = state.currentOrder) {
  if (!order || !isOrderCompleted(order)) {
    return;
  }

  resetMarketplaceForNextRequest();
  elements.requestStatus.textContent = `Order ${order.id} has arrived. The marketplace is ready for the next buyer request.`;
  elements.confirmStatus.textContent = `Order ${order.id} with ${order.seller.name} is complete. You can create a new request now.`;
}

function renderMarketplaceState() {
  renderRequestSummary();
  renderBuyerOffers();
  renderBuyerChat();
  renderBuyerMarketplaceThread();
  renderBuyerDirectComposer();
  renderBuyerNotifications();
  renderSelectedOffer();
  renderSellerTabs();
  renderBuyerMap();
  renderPaymentPanel();
  renderNotificationBadges();
}

function renderNotificationBadges() {
  Object.entries(TAB_LABELS).forEach(([panelId, label]) => {
    const button = elements.roleTabs.querySelector(`[data-tab-target="${panelId}"]`);
    if (!button) {
      return;
    }

    let count = 0;

    if (panelId === "buyer-panel") {
      count = countUnreadNotifications({ audienceType: "buyer" });
    } else {
      const slot = Number(panelId.replace("seller-panel-", ""));
      const seller = getMarketplaceSellers().find((item) => Number(item.marketplaceSlot) === slot);
      if (seller) {
        count = countUnreadNotifications({
          audienceType: "seller",
          sellerId: seller.id,
        });
      }
    }

    button.innerHTML = count
      ? `${label}<span class="tab-badge">${escapeHtml(String(count))}</span>`
      : label;
  });
}

function renderBuyerNotifications() {
  const notifications = listNotifications({
    audienceType: "buyer",
    limit: 6,
  });

  elements.buyerNotificationCountLabel.textContent = notifications.length
    ? `${notifications.length} recent alerts`
    : "No alerts";
  elements.buyerNotificationEmptyState.classList.toggle("hidden", notifications.length > 0);
  elements.buyerNotificationList.classList.toggle("hidden", notifications.length === 0);

  if (!notifications.length) {
    elements.buyerNotificationList.innerHTML = "";
    return;
  }

  elements.buyerNotificationList.innerHTML = renderNotificationCards(
    notifications,
    "No buyer notifications yet."
  );
}

async function handleRequestSubmit(event) {
  event.preventDefault();

  const { query, parsedRequest } = buildNormalizedRequest();
  const address = elements.addressInput.value.trim();

  if (hasActiveOrder()) {
    elements.requestStatus.textContent =
      "The current order is still in progress. Start a new request after it arrives.";
    return;
  }

  if (!query) {
    elements.requestStatus.textContent = "Please type a buyer request first.";
    return;
  }

  state.selectedOffer = null;
  elements.confirmOrderButton.disabled = true;
  elements.requestStatus.textContent = "Sending request to all sellers...";
  elements.confirmStatus.textContent =
    "Orders will be stored in requests, offers, orders, payments, and history.";

  try {
    const requestRecord = await createRequestRecord({
      query,
      quantity: parsedRequest.quantity,
      budget: parsedRequest.maxPrice,
      address,
      ranking: parsedRequest.ranking,
      parsedRequest,
    });

    const result = buildMarketplaceOffers(state.products, state.sellers, parsedRequest, 3);
    const savedOffers = await saveOfferRecords({
      request: requestRecord,
      offers: result.offers,
    });

    ensureChatThread({
      requestId: requestRecord.id,
      sellerIds: savedOffers.map((offer) => offer.seller.id),
      resetSelection: true,
    });
    syncOfferMessages({
      requestId: requestRecord.id,
      offers: savedOffers,
    });

    savedOffers.forEach((offer) => {
      addNotification({
        audienceType: "seller",
        sellerId: offer.seller.id,
        title: "New buyer request",
        body: requestRecord.query,
        kind: "new-request",
        requestId: requestRecord.id,
      });
    });

    hydrateMarketplaceState({
      requestRecord,
      savedOffers,
      currentOrder: state.currentOrder,
    });

    elements.requestStatus.textContent = "Request saved and 3 seller replies generated.";
  } catch (error) {
    console.error(error);
    elements.requestStatus.textContent =
      "The request could not be saved. Check your Firebase setup or use local demo mode.";
  }
}

function renderRequestSummary() {
  if (!state.currentRequest || !state.parsedRequest) {
    elements.requestEmptyState.classList.remove("hidden");
    elements.requestSummaryCard.classList.add("hidden");
    return;
  }

  elements.requestEmptyState.classList.add("hidden");
  elements.requestSummaryCard.classList.remove("hidden");
  elements.requestSummaryTitle.textContent = state.currentRequest.query;
  elements.requestSummaryText.textContent = `Buyer wants ${buildRequestSummary(
    state.parsedRequest
  )}. Sellers compete using their own product lists.`;

  const pills = [
    `Quantity ${state.parsedRequest.quantity}`,
    state.parsedRequest.maxPrice
      ? `Budget ${formatCurrency(state.parsedRequest.maxPrice)}`
      : "No budget limit",
    getCurrentBuyerAddress() ? "Address set" : "No address yet",
    `Ranking ${state.parsedRequest.ranking}`,
  ];

  elements.requestSummaryPills.innerHTML = pills
    .map((item) => `<span class="meta-chip">${escapeHtml(item)}</span>`)
    .join("");
}

function renderBuyerOffers() {
  const offers = getEffectiveRankedOffers();
  elements.offerCountLabel.textContent = offers.length
    ? `${offers.length} seller replies ready`
    : "No offers yet";
  elements.offersEmptyState.classList.toggle("hidden", offers.length > 0);

  if (!offers.length) {
    elements.offerGrid.innerHTML = "";
    return;
  }

  elements.offerGrid.innerHTML = offers
    .map((offer) => {
      const isSelected = state.selectedOffer?.seller?.id === offer.seller.id;
      const isUnavailable = offer.matchType === "unavailable";

      return `
        <article class="offer-card ${isSelected ? "is-selected" : ""}">
          <div class="offer-card-head">
            <div>
              <p class="eyebrow">Seller ${escapeHtml(String(offer.seller.marketplaceSlot || "-"))}</p>
              <h3>${escapeHtml(offer.seller.name)}</h3>
              <p class="meta-line">${escapeHtml(offer.seller.tagline || "Seller reply")}</p>
            </div>
            <span class="price-badge">${formatCurrency(offer.totalPrice)}</span>
          </div>

          <div class="offer-focus">
            <strong>${escapeHtml(offer.product.name)}</strong>
            <span class="muted-copy">${escapeHtml(offer.replyText || "Seller offer ready")}</span>
          </div>

          <div class="mini-list">
            <span class="soft-badge">${formatCurrency(offer.unitPrice)} each</span>
            <span class="soft-badge">Qty ${escapeHtml(String(offer.quantity))}</span>
            <span class="soft-badge">${escapeHtml(formatTemperature(offer.product.temperature))}</span>
            <span class="soft-badge">${escapeHtml(`${offer.product.prepMinutes || 10} min`)}</span>
          </div>

          <div class="pill-row">
            ${(offer.badges || []).map((badge) => `<span class="tag">${escapeHtml(badge)}</span>`).join("")}
          </div>

          <div class="pill-row">
            ${(offer.reasons || []).slice(0, 4).map((reason) => `<span class="meta-chip">${escapeHtml(reason)}</span>`).join("")}
          </div>

          <div class="offer-actions">
            <button class="button secondary" data-choose-offer="${escapeHtml(offer.id)}" type="button" ${isUnavailable ? "disabled" : ""}>
              ${isUnavailable ? "Unavailable" : isSelected ? "Chosen" : "Choose this offer"}
            </button>
            <button class="button ghost" data-open-seller-tab="${escapeHtml(String(offer.seller.marketplaceSlot || ""))}" type="button">
              Open seller tab
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderBuyerChat() {
  const request = state.currentRequest;

  if (!request || !state.offers.length) {
    elements.buyerChatEmptyState.classList.remove("hidden");
    elements.buyerChatGrid.classList.add("hidden");
    elements.buyerChatGrid.innerHTML = "";
    elements.buyerChatScopeLabel.textContent = "No active chat yet";
    return;
  }

  const selectedSellerId = getSelectedChatSellerId();
  const visibleOffers = selectedSellerId
    ? getEffectiveRankedOffers().filter((offer) => offer.seller.id === selectedSellerId)
    : getEffectiveRankedOffers();
  const selectedOffer = visibleOffers[0] || null;

  elements.buyerChatEmptyState.classList.add("hidden");
  elements.buyerChatGrid.classList.remove("hidden");
  elements.buyerChatGrid.classList.toggle("is-single", visibleOffers.length === 1);
  elements.buyerChatScopeLabel.textContent = selectedSellerId
    ? `Chat is focused on ${selectedOffer?.seller.name || "the selected seller"}`
    : "All 3 sellers can chat before you pick one offer";

  elements.buyerChatGrid.innerHTML = visibleOffers
    .map((offer) => {
      const messages = listThreadMessages(request.id, offer.seller.id);

      return `
        <article class="chat-card">
          <div class="chat-card-head">
            <div>
              <p class="eyebrow">Seller ${escapeHtml(String(offer.seller.marketplaceSlot || "-"))}</p>
              <h3>${escapeHtml(offer.seller.name)}</h3>
              <p class="meta-line">${escapeHtml(offer.product.name)} • ${formatCurrency(offer.totalPrice)}</p>
            </div>
            <span class="soft-badge">${escapeHtml(selectedSellerId ? "Selected thread" : "Open")}</span>
          </div>

          <div class="chat-thread compact-thread">
            ${renderChatMessages(
              messages,
              `No manual messages yet. ${offer.seller.name} already posted the offer above.`
            )}
          </div>

          <form class="chat-composer" data-chat-form="buyer" data-seller-id="${escapeHtml(offer.seller.id)}">
            <label class="field">
              <span>Message to ${escapeHtml(offer.seller.name)}</span>
              <textarea data-chat-input rows="2" placeholder="Ask about price, prep time, portion, or delivery..."></textarea>
            </label>
            <button class="button secondary" type="submit">Send to seller</button>
          </form>
        </article>
      `;
    })
    .join("");
}

function renderBuyerDirectComposer() {
  const allOffers = getEffectiveRankedOffers();
  const focusedSellerId = state.selectedOffer?.seller?.id || getSelectedChatSellerId() || "";
  const offers = focusedSellerId
    ? allOffers.filter((offer) => offer.seller.id === focusedSellerId)
    : allOffers;
  const selectedSellerId = focusedSellerId || "";
  const canMessage = Boolean(state.currentRequest && offers.length);
  const previousValue = elements.buyerDirectSeller.value;
  const nextValue = selectedSellerId || previousValue;

  elements.buyerDirectSeller.innerHTML = canMessage
    ? [
        '<option value="">Choose a seller</option>',
        ...offers.map((offer) => {
          return `<option value="${escapeHtml(offer.seller.id)}">${escapeHtml(
            `Seller ${offer.seller.marketplaceSlot} - ${offer.seller.name}`
          )}</option>`;
        }),
      ].join("")
    : '<option value="">Choose a seller first</option>';

  elements.buyerDirectSeller.value = canMessage ? nextValue : "";
  elements.buyerDirectSeller.disabled = !canMessage;
  elements.buyerDirectPrice.disabled = !canMessage;
  elements.buyerDirectMessage.disabled = !canMessage;
  elements.buyerDirectForm.querySelector("button[type='submit']").disabled = !canMessage;

  if (!canMessage) {
    elements.buyerDirectStatus.textContent =
      "Use this to negotiate with one seller after the offers appear.";
    return;
  }

  elements.buyerDirectStatus.textContent = elements.buyerDirectSeller.value
    ? `${
        state.selectedOffer?.seller?.id === elements.buyerDirectSeller.value
          ? "Chat is locked to"
          : "Negotiating with"
      } ${getMarketplaceSellers().find((seller) => seller.id === elements.buyerDirectSeller.value)?.name || "a seller"}.`
    : "Choose a seller, ask for a better price, then accept the deal you like.";
}

function renderBuyerMarketplaceThread() {
  const hasConversation = Boolean(state.currentRequest || state.currentOrder);

  elements.marketplaceEmptyState.classList.toggle("hidden", hasConversation);
  elements.marketplaceThread.classList.toggle("hidden", !hasConversation);

  if (!hasConversation) {
    elements.marketplaceThread.innerHTML = "";
    elements.buyerChatScopeLabel.textContent = "No active chat yet";
    return;
  }

  const threadCards = [];
  const effectiveOffers = getEffectiveRankedOffers();

  if (state.currentRequest && state.parsedRequest) {
    threadCards.push(`
      <article class="message user thread-bubble">
        <div class="message-meta">
          <span class="message-role">Buyer Request</span>
          <span class="message-time">${escapeHtml(formatDateTime(state.currentRequest.createdAt))}</span>
        </div>
        <p>${escapeHtml(state.currentRequest.query)}</p>
      </article>
    `);

    threadCards.push(`
      <article class="thread-card assistant-card">
        <p class="eyebrow">Store Assistant</p>
        <h3>${escapeHtml(state.currentRequest.query)}</h3>
        <p class="meta-line">Buyer wants ${escapeHtml(buildRequestSummary(state.parsedRequest))}. Sellers will compete in this thread.</p>
        <div class="pill-row">
          <span class="meta-chip">Quantity ${escapeHtml(String(state.parsedRequest.quantity || 1))}</span>
          <span class="meta-chip">${escapeHtml(
            state.parsedRequest.maxPrice ? formatCurrency(state.parsedRequest.maxPrice) : "No budget limit"
          )}</span>
          <span class="meta-chip">Ranking ${escapeHtml(state.parsedRequest.ranking || "best-match")}</span>
        </div>
      </article>
    `);

    effectiveOffers.forEach((offer) => {
      threadCards.push(renderSellerOfferBubble(offer));
    });

    getMarketplaceConversationMessages().forEach((message) => {
      threadCards.push(renderMarketplaceMessage(message));
    });
  }

  if (state.selectedOffer && !state.currentOrder) {
    threadCards.push(renderCheckoutPromptCard(state.selectedOffer));
  }

  if (state.currentOrder) {
    threadCards.push(renderActiveOrderCard(state.currentOrder));
  }

  elements.marketplaceThread.innerHTML = threadCards.join("");
  const focusedSellerId = getSelectedChatSellerId();
  const focusedSellerName =
    getMarketplaceSellers().find((seller) => seller.id === focusedSellerId)?.name || "one seller";
  elements.buyerChatScopeLabel.textContent = focusedSellerId
    ? `Focused on ${focusedSellerName}`
    : "All three sellers can reply here";
}

function getMarketplaceConversationMessages() {
  if (!state.currentRequest) {
    return [];
  }

  const messages = state.offers.flatMap((offer) =>
    listThreadMessages(state.currentRequest.id, offer.seller.id)
  );

  return messages
    .filter((message) => message.metadata?.kind !== "offer-intro")
    .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
}

function renderSellerOfferBubble(offer) {
  const isSelected = state.selectedOffer?.seller?.id === offer.seller.id;
  const isUnavailable = offer.matchType === "unavailable";
  const isFocused = getSelectedChatSellerId() === offer.seller.id;
  const disableAccept = isUnavailable || hasActiveOrder();

  return `
    <article class="thread-card seller-deal-card ${isSelected ? "is-selected" : ""}">
      <div class="chat-card-head">
        <div>
          <p class="eyebrow">Seller ${escapeHtml(String(offer.seller.marketplaceSlot || "-"))}</p>
          <h3>${escapeHtml(offer.seller.name)}</h3>
          <p class="meta-line">${escapeHtml(offer.seller.tagline || "Seller reply")}</p>
        </div>
        <span class="price-badge">${formatCurrency(offer.totalPrice)}</span>
      </div>

      <div class="offer-focus">
        <strong>${escapeHtml(offer.product.name)}</strong>
        <span class="muted-copy">${escapeHtml(offer.replyText || "Seller offer ready")}</span>
      </div>

      <div class="mini-list">
        <span class="soft-badge">${formatCurrency(offer.unitPrice)} each</span>
        <span class="soft-badge">Qty ${escapeHtml(String(offer.quantity))}</span>
        <span class="soft-badge">${escapeHtml(formatTemperature(offer.product.temperature))}</span>
        <span class="soft-badge">${escapeHtml(`${offer.product.prepMinutes || 10} min`)}</span>
      </div>

      <div class="pill-row">
        ${(offer.badges || []).map((badge) => `<span class="tag">${escapeHtml(badge)}</span>`).join("")}
      </div>

      <div class="offer-actions">
        <button class="button secondary" type="button" data-thread-negotiate="${escapeHtml(offer.seller.id)}">
          ${isFocused ? "Continue chat" : "Ask better price"}
        </button>
        <button
          class="button ${isSelected ? "primary" : "ghost"}"
          type="button"
          data-thread-accept-offer="${escapeHtml(offer.seller.id)}"
          ${disableAccept ? "disabled" : ""}
        >
          ${isUnavailable ? "Unavailable" : isSelected ? "Deal selected" : hasActiveOrder() ? "Order in progress" : "Accept this offer"}
        </button>
        <button class="button ghost" type="button" data-open-seller-tab="${escapeHtml(String(offer.seller.marketplaceSlot || ""))}">
          Seller tab
        </button>
      </div>
    </article>
  `;
}

function renderMarketplaceMessage(message) {
  if (message.metadata?.kind === "offer-revision") {
    const offerSnapshot = message.metadata.offerSnapshot || {};

    return `
      <article class="thread-card revision-card">
        <div class="chat-card-head">
          <div>
            <p class="eyebrow">${escapeHtml(message.senderLabel || "Seller")}</p>
            <h3>Revised offer</h3>
            <p class="meta-line">${escapeHtml(message.text)}</p>
          </div>
          <span class="price-badge">${formatCurrency(offerSnapshot.totalPrice || 0)}</span>
        </div>

        <div class="mini-list">
          <span class="soft-badge">${formatCurrency(offerSnapshot.unitPrice || 0)} each</span>
          <span class="soft-badge">Qty ${escapeHtml(String(offerSnapshot.quantity || 1))}</span>
          <span class="soft-badge">${escapeHtml(formatDateTime(message.createdAt))}</span>
        </div>

        <div class="offer-actions">
          <button class="button primary" type="button" data-thread-accept-offer="${escapeHtml(message.sellerId)}">
            Accept revised offer
          </button>
          <button class="button secondary" type="button" data-thread-negotiate="${escapeHtml(message.sellerId)}">
            Reply in chat
          </button>
        </div>
      </article>
    `;
  }

  const roleClass = message.senderType === "buyer" ? "user" : "assistant";

  return `
    <article class="message ${roleClass} thread-bubble">
      <div class="message-meta">
        <span class="message-role">${escapeHtml(message.senderLabel || message.senderType)}</span>
        <span class="message-time">${escapeHtml(formatDateTime(message.createdAt))}</span>
      </div>
      <p>${escapeHtml(message.text)}</p>
    </article>
  `;
}

function renderCheckoutPromptCard(offer) {
  return `
    <article class="thread-card checkout-card-message">
      <p class="eyebrow">Checkout Ready</p>
      <h3>${escapeHtml(offer.product.name)} from ${escapeHtml(offer.seller.name)}</h3>
      <p class="meta-line">The latest accepted deal is ready. Fill your name and phone in the side panel, then confirm the order.</p>
      <div class="pill-row">
        <span class="tag">${escapeHtml(formatCurrency(offer.totalPrice))}</span>
        <span class="meta-chip">Qty ${escapeHtml(String(offer.quantity))}</span>
        <span class="meta-chip">${escapeHtml(offer.seller.phoneNumber || "-")}</span>
      </div>
    </article>
  `;
}

function renderActiveOrderCard(order) {
  return `
    <article class="thread-card order-live-card">
      <div class="chat-card-head">
        <div>
          <p class="eyebrow">Order Live</p>
          <h3>${escapeHtml(order.product.name)} from ${escapeHtml(order.seller.name)}</h3>
          <p class="meta-line">Buyer can watch payment and seller-controlled delivery status here.</p>
        </div>
        <span class="price-badge">${formatCurrency(order.totalPrice)}</span>
      </div>

      <div class="pill-row">
        <span class="meta-chip">Payment ${escapeHtml(formatStatusLabel(order.paymentStatus || "pending"))}</span>
        <span class="meta-chip">Status ${escapeHtml(formatStatusLabel(order.fulfillmentStatus || "confirmed"))}</span>
      </div>
    </article>
  `;
}

function renderChatMessages(messages, emptyText) {
  if (!messages.length) {
    return `<div class="empty-state compact-empty">${escapeHtml(emptyText)}</div>`;
  }

  return messages
    .map((message) => {
      const roleClass = message.senderType === "buyer" ? "user" : "assistant";

      return `
        <article class="message ${roleClass}">
          <div class="message-meta">
            <span class="message-role">${escapeHtml(message.senderLabel || message.senderType)}</span>
            <span class="message-time">${escapeHtml(formatDateTime(message.createdAt))}</span>
          </div>
          <p>${escapeHtml(message.text)}</p>
        </article>
      `;
    })
    .join("");
}

function renderNotificationCards(notifications, emptyText) {
  if (!notifications.length) {
    return `<div class="empty-state compact-empty">${escapeHtml(emptyText)}</div>`;
  }

  return notifications
    .map((notification) => {
      return `
        <article class="notification-card ${notification.read ? "" : "is-unread"}">
          <div class="notification-head">
            <strong>${escapeHtml(notification.title)}</strong>
            <span class="message-time">${escapeHtml(formatDateTime(notification.createdAt))}</span>
          </div>
          <p>${escapeHtml(notification.body)}</p>
        </article>
      `;
    })
    .join("");
}

function handleBuyerThreadClick(event) {
  const negotiateButton = event.target.closest("[data-thread-negotiate]");
  if (negotiateButton) {
    const sellerId = negotiateButton.getAttribute("data-thread-negotiate");
    focusBuyerNegotiation(sellerId, "Can you do another price?");
    return;
  }

  const acceptButton = event.target.closest("[data-thread-accept-offer]");
  if (acceptButton) {
    if (hasActiveOrder()) {
      elements.confirmStatus.textContent =
        "Finish the current order first. Then you can accept a new seller deal.";
      return;
    }

    const sellerId = acceptButton.getAttribute("data-thread-accept-offer");
    const offer = getEffectiveOfferBySellerId(sellerId);

    if (!offer) {
      return;
    }

    state.selectedOffer = offer;
    if (state.currentRequest) {
      setSelectedSellerForChat(state.currentRequest.id, sellerId);
    }

    elements.confirmStatus.textContent = `Deal selected from ${offer.seller.name}. Confirm it from the side panel when you are ready.`;
    renderMarketplaceState();
    return;
  }

  const sellerTabButton = event.target.closest("[data-open-seller-tab]");
  if (sellerTabButton) {
    const slot = sellerTabButton.getAttribute("data-open-seller-tab");
    switchTab(`seller-panel-${slot}`);
  }
}

function focusBuyerNegotiation(sellerId, suggestedMessage = "") {
  const offer = getEffectiveOfferBySellerId(sellerId);

  if (!state.currentRequest || !offer) {
    return;
  }

  setSelectedSellerForChat(state.currentRequest.id, sellerId);
  renderBuyerDirectComposer();
  elements.buyerDirectSeller.value = sellerId;
  if (suggestedMessage) {
    elements.buyerDirectMessage.value = suggestedMessage;
  }
  elements.buyerDirectStatus.textContent = `Chat focused on ${offer.seller.name}. Ask for another price or accept the current deal.`;
  elements.buyerDirectMessage.focus();
}

function handleOfferGridClick(event) {
  const chooseButton = event.target.closest("[data-choose-offer]");
  if (chooseButton) {
    const offerId = chooseButton.getAttribute("data-choose-offer");
    const baseOffer = state.offers.find((offer) => offer.id === offerId) || null;
    state.selectedOffer = baseOffer ? buildEffectiveOffer(baseOffer) : null;

    if (state.currentRequest && state.selectedOffer?.seller?.id) {
      setSelectedSellerForChat(state.currentRequest.id, state.selectedOffer.seller.id);
    }

    renderBuyerOffers();
    renderBuyerChat();
    renderSelectedOffer();
    renderSellerTabs();
    renderBuyerMap();
    return;
  }

  const tabButton = event.target.closest("[data-open-seller-tab]");
  if (tabButton) {
    const slot = tabButton.getAttribute("data-open-seller-tab");
    switchTab(`seller-panel-${slot}`);
  }
}

function handleBuyerDirectSubmit(event) {
  event.preventDefault();

  if (!state.currentRequest) {
    elements.buyerDirectStatus.textContent =
      "Send one buyer request first, then negotiate with a seller here.";
    return;
  }

  const sellerId = elements.buyerDirectSeller.value;
  const messageText = elements.buyerDirectMessage.value.trim();
  const desiredTotalPrice = Number(elements.buyerDirectPrice.value) || null;
  const seller = state.sellers.find((item) => item.id === sellerId);

  if (!sellerId || !messageText) {
    elements.buyerDirectStatus.textContent =
      "Choose a seller and write a short negotiation message first.";
    return;
  }

  const finalMessage = desiredTotalPrice
    ? `${messageText} Target total ${formatCurrency(desiredTotalPrice)}.`
    : messageText;

  setSelectedSellerForChat(state.currentRequest.id, sellerId);
  addChatMessage({
    requestId: state.currentRequest.id,
    sellerId,
    senderType: "buyer",
    senderId: "buyer-active",
    senderLabel: elements.confirmBuyerName.value.trim() || "Buyer",
    text: finalMessage,
    metadata: desiredTotalPrice
      ? {
          kind: "negotiation-request",
          desiredTotalPrice,
        }
      : {
          kind: "buyer-chat",
        },
  });

  addNotification({
    audienceType: "seller",
    sellerId,
    title: "New buyer message",
    body: finalMessage,
    kind: desiredTotalPrice ? "negotiation-request" : "chat",
    requestId: state.currentRequest.id,
  });

  elements.buyerDirectMessage.value = "";
  elements.buyerDirectPrice.value = "";
  elements.buyerDirectStatus.textContent = `Message sent to ${seller?.name || "seller"}. Wait for the reply in the chat thread.`;
  renderMarketplaceState();
}

function renderSelectedOffer() {
  const offer = state.selectedOffer;
  const address = getCurrentBuyerAddress();
  const hasSelection = Boolean(offer);
  const disableConfirm = !hasSelection || Number(offer?.unitPrice || 0) <= 0 || hasActiveOrder();

  elements.selectedOfferEmptyState.classList.toggle("hidden", hasSelection);
  elements.selectedOfferPanel.classList.toggle("hidden", !hasSelection);
  elements.confirmOrderButton.disabled = disableConfirm;

  if (!hasSelection) {
    return;
  }

  elements.selectedOfferSellerLabel.textContent = `Seller ${offer.seller.marketplaceSlot}: ${offer.seller.name}`;
  elements.selectedOfferProductName.textContent = offer.product.name;
  elements.selectedOfferReply.textContent = offer.replyText || "Seller offer selected.";
  elements.selectedOfferTotal.textContent = formatCurrency(offer.totalPrice);
  elements.selectedOfferUnitPrice.textContent = formatCurrency(offer.unitPrice);
  elements.selectedOfferQuantity.textContent = String(offer.quantity);
  elements.selectedOfferAddress.textContent = address || "No address yet";
  elements.selectedOfferContact.textContent = offer.seller.phoneNumber || "-";
  elements.selectedOfferBadges.innerHTML = [...(offer.badges || []), ...(offer.reasons || []).slice(0, 2)]
    .map((item) => `<span class="tag">${escapeHtml(item)}</span>`)
    .join("");
}

function renderSellerTabs() {
  const sellerMap = new Map(
    state.offers.map((offer) => [Number(offer.seller.marketplaceSlot || 0), offer])
  );
  const marketplaceSellers = getMarketplaceSellers();

  for (const slot of [1, 2, 3]) {
    const offer = sellerMap.get(slot);
    const seller = marketplaceSellers.find((item) => Number(item.marketplaceSlot) === slot);
    const isTrackingSeller = Boolean(
      state.currentOrder && !isOrderCompleted(state.currentOrder) && state.currentOrder.seller.id === seller?.id
    );

    if (isTrackingSeller && seller) {
      elements.sellerCards[slot].innerHTML = renderSellerOrderPanel(
        slot,
        seller,
        state.currentOrder
      );
      continue;
    }

    if (offer && seller) {
      elements.sellerCards[slot].innerHTML = renderSellerPanel(
        slot,
        seller,
        buildEffectiveOffer(offer)
      );
      continue;
    }

    elements.sellerCards[slot].innerHTML = renderSellerCardSkeleton(slot, seller);
  }

  renderSellerChatThreads();
  renderSellerMaps();
  renderSellerNotificationLists();
}

function renderSellerCardSkeleton(slot, seller) {
  return `
    <div class="section-head">
      <div>
        <p class="eyebrow">Seller ${escapeHtml(String(slot))}</p>
        <h3>${escapeHtml(seller?.name || `Seller ${slot}`)}</h3>
      </div>
    </div>
    <div class="empty-state">
      Waiting for the buyer request. This tab will show the next request, seller notifications,
      and order tracking actions.
    </div>
    ${renderSellerNotificationShell(slot)}
  `;
}

function renderSellerPanel(slot, seller, offer) {
  const requestText = state.currentRequest?.query || "No buyer request yet.";
  const requestMeta = state.currentRequest
    ? `Quantity ${state.currentRequest.quantity} • ${state.currentRequest.budget ? formatCurrency(state.currentRequest.budget) : "No budget limit"}`
    : "Waiting for buyer";
  const selectedSellerId = getSelectedChatSellerId();
  const isLockedToAnotherSeller = Boolean(selectedSellerId && selectedSellerId !== seller.id);
  const chatScope = selectedSellerId
    ? isLockedToAnotherSeller
      ? "Buyer chose another seller, so this thread is now read-only."
      : "Buyer selected this seller. Continue the discussion here."
    : "Buyer can still compare and chat with all 3 sellers.";

  return `
    <div class="section-head">
      <div>
        <p class="eyebrow">Seller ${escapeHtml(String(slot))}</p>
        <h3>${escapeHtml(seller.name)}</h3>
        <p class="meta-line">${escapeHtml(seller.tagline || "Seller profile")}</p>
      </div>
      <span class="price-badge">${formatCurrency(offer.totalPrice)}</span>
    </div>

    <div class="seller-panel-grid">
      <div class="seller-panel-block">
        <p class="eyebrow">Buyer request received</p>
        <strong>${escapeHtml(requestText)}</strong>
        <p class="meta-line">${escapeHtml(requestMeta)}</p>
      </div>

      <div class="seller-panel-block">
        <p class="eyebrow">Seller reply</p>
        <strong>${escapeHtml(offer.product.name)}</strong>
        <p class="meta-line">${escapeHtml(offer.replyText)}</p>
      </div>
    </div>

    <div class="summary-list">
      <div class="summary-row">
        <span>Unit price</span>
        <strong>${formatCurrency(offer.unitPrice)}</strong>
      </div>
      <div class="summary-row">
        <span>Quantity</span>
        <strong>${escapeHtml(String(offer.quantity))}</strong>
      </div>
      <div class="summary-row">
        <span>Total</span>
        <strong>${formatCurrency(offer.totalPrice)}</strong>
      </div>
      <div class="summary-row">
        <span>Portion</span>
        <strong>${escapeHtml(formatSizeLabel(offer.product))}</strong>
      </div>
      <div class="summary-row">
        <span>Temperature</span>
        <strong>${escapeHtml(formatTemperature(offer.product.temperature))}</strong>
      </div>
      <div class="summary-row">
        <span>Contact</span>
        <strong>${escapeHtml(seller.phoneNumber)}</strong>
      </div>
      <div class="summary-row">
        <span>Profile media</span>
        <strong>${escapeHtml(seller.shortVideo || "No video yet")}</strong>
      </div>
    </div>

    <div class="pill-row">
      ${(offer.badges || []).map((badge) => `<span class="tag">${escapeHtml(badge)}</span>`).join("")}
    </div>

    <div class="pill-row">
      ${(offer.reasons || []).map((reason) => `<span class="meta-chip">${escapeHtml(reason)}</span>`).join("")}
    </div>

    <div class="seller-panel-block">
      <div class="section-head">
        <div>
          <p class="eyebrow">Deal control</p>
          <h3>Send a revised price</h3>
        </div>
        <span class="muted-copy">${escapeHtml(formatCurrency(offer.totalPrice))} current total</span>
      </div>
      <form class="chat-composer" data-revision-form="seller" data-seller-id="${escapeHtml(seller.id)}">
        <label class="field">
          <span>New unit price</span>
          <input data-revision-price type="number" min="0" placeholder="${escapeHtml(String(offer.unitPrice))}" ${isLockedToAnotherSeller ? "disabled" : ""} />
        </label>
        <label class="field">
          <span>Reply note</span>
          <textarea data-revision-note rows="2" placeholder="Example: I can do a better total if you confirm now." ${isLockedToAnotherSeller ? "disabled" : ""}></textarea>
        </label>
        <button class="button secondary" type="submit" ${isLockedToAnotherSeller ? "disabled" : ""}>
          Send revised offer
        </button>
      </form>
    </div>

    ${renderSellerNotificationShell(slot)}

    <div class="seller-panel-block">
      <div class="section-head">
        <div>
          <p class="eyebrow">Map preview</p>
          <h3>Buyer route to ${escapeHtml(seller.name)}</h3>
        </div>
        <span class="muted-copy" id="seller-distance-${slot}">Waiting for address</span>
      </div>
      <div class="map-shell compact-map">
        <div class="map-canvas compact-map-canvas" id="seller-map-${slot}"></div>
      </div>
      <div class="offer-actions">
        <a
          class="button secondary"
          id="seller-route-link-${slot}"
          href="#"
          target="_blank"
          rel="noreferrer"
        >
          Open route
        </a>
      </div>
    </div>

    <div class="seller-panel-block">
      <div class="section-head">
        <div>
          <p class="eyebrow">Chat</p>
          <h3>Buyer and seller messages</h3>
        </div>
        <span class="muted-copy">${escapeHtml(chatScope)}</span>
      </div>
      <div class="chat-thread compact-thread" id="seller-chat-thread-${slot}"></div>
      <form class="chat-composer" data-chat-form="seller" data-seller-id="${escapeHtml(seller.id)}">
        <label class="field">
          <span>Reply as ${escapeHtml(seller.name)}</span>
          <textarea data-chat-input rows="2" placeholder="Reply to the buyer here..." ${isLockedToAnotherSeller ? "disabled" : ""}></textarea>
        </label>
        <button class="button secondary" type="submit" ${isLockedToAnotherSeller ? "disabled" : ""}>
          Send seller reply
        </button>
      </form>
    </div>
  `;
}

function renderSellerOrderPanel(slot, seller, order) {
  return `
    <div class="section-head">
      <div>
        <p class="eyebrow">Seller ${escapeHtml(String(slot))}</p>
        <h3>${escapeHtml(seller.name)}</h3>
        <p class="meta-line">Active order tracking for the buyer.</p>
      </div>
      <span class="price-badge">${escapeHtml(formatStatusLabel(order.fulfillmentStatus || "confirmed"))}</span>
    </div>

    <div class="seller-panel-grid">
      <div class="seller-panel-block">
        <p class="eyebrow">Current order</p>
        <strong>${escapeHtml(order.product.name)}</strong>
        <p class="meta-line">${escapeHtml(order.buyer.name)} • ${escapeHtml(order.buyer.address)}</p>
      </div>

      <div class="seller-panel-block">
        <p class="eyebrow">Buyer contact</p>
        <strong>${escapeHtml(order.buyer.phoneNumber)}</strong>
        <p class="meta-line">Update the order status below and the buyer will be notified.</p>
      </div>
    </div>

    <div class="summary-list">
      <div class="summary-row">
        <span>Total</span>
        <strong>${formatCurrency(order.totalPrice)}</strong>
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
        <span>Last update</span>
        <strong>${escapeHtml(formatDateTime(order.updatedAt || order.createdAt))}</strong>
      </div>
    </div>

    <div class="status-actions">
      ${renderFulfillmentButtons(order, seller.id)}
    </div>

    <div class="seller-panel-block">
      <div class="section-head">
        <div>
          <p class="eyebrow">Chat</p>
          <h3>Stay in touch with the buyer</h3>
        </div>
        <span class="muted-copy">Seller controls status. Buyer only sees the updates.</span>
      </div>
      <div class="chat-thread compact-thread" id="seller-chat-thread-${slot}"></div>
      <form class="chat-composer" data-chat-form="seller" data-seller-id="${escapeHtml(seller.id)}">
        <label class="field">
          <span>Reply as ${escapeHtml(seller.name)}</span>
          <textarea data-chat-input rows="2" placeholder="Send an update or answer the buyer here..."></textarea>
        </label>
        <button class="button secondary" type="submit">Send seller reply</button>
      </form>
    </div>

    ${renderSellerNotificationShell(slot)}
  `;
}

function renderSellerNotificationShell(slot) {
  return `
    <div class="seller-panel-block">
      <div class="section-head">
        <div>
          <p class="eyebrow">Notifications</p>
          <h3>Seller alerts</h3>
        </div>
        <span class="muted-copy" id="seller-notification-count-${slot}">No alerts</span>
      </div>
      <div class="stack-list compact-stack" id="seller-notifications-${slot}"></div>
    </div>
  `;
}

function renderFulfillmentButtons(order, sellerId) {
  return FULFILLMENT_STEPS.filter((status) => status !== "confirmed")
    .map((status) => {
      const isActive = order.fulfillmentStatus === status;

      return `
        <button
          class="button ${isActive ? "primary" : "secondary"}"
          type="button"
          data-fulfillment-action="${escapeHtml(status)}"
          data-seller-id="${escapeHtml(sellerId)}"
          ${isActive ? "disabled" : ""}
        >
          ${escapeHtml(formatStatusLabel(status))}
        </button>
      `;
    })
    .join("");
}

function renderSellerChatThreads() {
  for (const slot of [1, 2, 3]) {
    const offer = state.offers.find(
      (item) => Number(item.seller.marketplaceSlot || 0) === Number(slot)
    );
    const threadElement = document.querySelector(`#seller-chat-thread-${slot}`);

    if (!offer || !threadElement || !state.currentRequest) {
      continue;
    }

    const messages = listThreadMessages(state.currentRequest.id, offer.seller.id);
    threadElement.innerHTML = renderChatMessages(
      messages,
      "No manual chat yet. This seller can answer buyer questions here."
    );
  }
}

function renderSellerNotificationLists() {
  const sellers = getMarketplaceSellers();

  for (const slot of [1, 2, 3]) {
    const seller = sellers.find((item) => Number(item.marketplaceSlot) === slot);
    const listElement = document.querySelector(`#seller-notifications-${slot}`);
    const countElement = document.querySelector(`#seller-notification-count-${slot}`);

    if (!seller || !listElement || !countElement) {
      continue;
    }

    const notifications = listNotifications({
      audienceType: "seller",
      sellerId: seller.id,
      limit: 4,
    });

    countElement.textContent = notifications.length
      ? `${notifications.length} recent alerts`
      : "No alerts";
    listElement.innerHTML = renderNotificationCards(
      notifications,
      "No seller notifications yet."
    );
  }
}

async function renderBuyerMap() {
  const buyerAddress = getCurrentBuyerAddress();
  const offer = state.selectedOffer;

  if (!offer || !buyerAddress) {
    elements.buyerMapEmptyState.classList.remove("hidden");
    elements.buyerMapPanel.classList.add("hidden");
    elements.buyerMapDistance.textContent = "Distance unavailable";
    elements.buyerRouteMeta.innerHTML = "";
    elements.buyerRouteLink.href = "#";
    return;
  }

  elements.buyerMapEmptyState.classList.add("hidden");
  elements.buyerMapPanel.classList.remove("hidden");
  elements.buyerMapDistance.textContent = "Loading route...";
  elements.buyerRouteMeta.innerHTML = `
    <div class="route-meta-card">
      <strong>Buyer address</strong>
      <p>${escapeHtml(buyerAddress)}</p>
    </div>
    <div class="route-meta-card">
      <strong>Seller address</strong>
      <p>${escapeHtml(offer.seller.address || "-")}</p>
    </div>
  `;

  const route = await renderRouteMap({
    container: elements.buyerRouteMap,
    buyerAddress,
    sellerAddress: offer.seller.address,
    sellerLocation: offer.seller.location,
    buyerLabel: "Buyer",
    sellerLabel: offer.seller.name,
  });

  if (!route) {
    elements.buyerMapDistance.textContent = "Distance unavailable";
    return;
  }

  elements.buyerMapDistance.textContent = `${route.distanceKm.toFixed(1)} km approx`;
  elements.buyerRouteLink.href = route.routeLink;
}

async function renderSellerMaps() {
  const buyerAddress = getCurrentBuyerAddress();

  for (const slot of [1, 2, 3]) {
    const offer = state.offers.find(
      (item) => Number(item.seller.marketplaceSlot || 0) === Number(slot)
    );
    const container = document.querySelector(`#seller-map-${slot}`);
    const distanceElement = document.querySelector(`#seller-distance-${slot}`);
    const linkElement = document.querySelector(`#seller-route-link-${slot}`);

    if (!offer || !container || !distanceElement || !linkElement) {
      continue;
    }

    if (!buyerAddress) {
      distanceElement.textContent = "Waiting for buyer address";
      container.innerHTML =
        '<div class="empty-state compact-empty">Add the buyer address to preview the route.</div>';
      linkElement.href = "#";
      continue;
    }

    distanceElement.textContent = "Loading route...";

    const route = await renderRouteMap({
      container,
      buyerAddress,
      sellerAddress: offer.seller.address,
      sellerLocation: offer.seller.location,
      buyerLabel: "Buyer",
      sellerLabel: offer.seller.name,
    });

    if (!route) {
      distanceElement.textContent = "Distance unavailable";
      linkElement.href = "#";
      continue;
    }

    distanceElement.textContent = `${route.distanceKm.toFixed(1)} km approx`;
    linkElement.href = route.routeLink;
  }
}

function renderPaymentPanel() {
  const order = state.currentOrder;

  if (!order) {
    elements.paymentEmptyState.classList.remove("hidden");
    elements.paymentPanel.classList.add("hidden");
    return;
  }

  elements.paymentEmptyState.classList.add("hidden");
  elements.paymentPanel.classList.remove("hidden");
  elements.paymentOrderLabel.textContent = `Order ${order.id}`;
  elements.paymentOrderTitle.textContent = `${order.product.name} from ${order.seller.name}`;
  elements.paymentOrderMeta.textContent = `${order.buyer.name} • ${order.buyer.phoneNumber}`;
  elements.paymentAmount.textContent = formatCurrency(order.totalPrice);
  elements.paymentOrderStatus.textContent = formatStatusLabel(order.status);
  elements.paymentStatusBadge.textContent = formatStatusLabel(order.paymentStatus || "pending");
  elements.fulfillmentStatusBadge.textContent = formatStatusLabel(
    order.fulfillmentStatus || "confirmed"
  );
  elements.paymentUpdatedAt.textContent = formatDateTime(order.updatedAt || order.createdAt);
  elements.fulfillmentSteps.innerHTML = FULFILLMENT_STEPS.map((status) => {
    const currentIndex = FULFILLMENT_STEPS.indexOf(order.fulfillmentStatus || "confirmed");
    const stepIndex = FULFILLMENT_STEPS.indexOf(status);
    const classes =
      stepIndex < currentIndex
        ? "status-step is-complete"
        : stepIndex === currentIndex
          ? "status-step is-active"
          : "status-step";

    return `<span class="${classes}">${escapeHtml(formatStatusLabel(status))}</span>`;
  }).join("");
}

function formatStatusLabel(value) {
  return String(value || "-")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

async function handleConfirmSubmit(event) {
  event.preventDefault();

  if (hasActiveOrder()) {
    elements.confirmStatus.textContent =
      "This order is already active. Wait until it arrives before starting a new one.";
    return;
  }

  if (!state.selectedOffer || !state.currentRequest) {
    elements.confirmStatus.textContent = "Choose one seller offer before confirming.";
    return;
  }

  if (Number(state.selectedOffer.unitPrice || 0) <= 0) {
    elements.confirmStatus.textContent = "This seller does not have a valid offer yet.";
    return;
  }

  const buyerName = elements.confirmBuyerName.value.trim();
  const buyerPhone = elements.confirmBuyerPhone.value.trim();
  const buyerAddress = getCurrentBuyerAddress();

  if (!buyerName || !buyerPhone || !buyerAddress) {
    elements.confirmStatus.textContent =
      "Please fill buyer name, phone number, and delivery address before confirming.";
    return;
  }

  elements.confirmOrderButton.disabled = true;
  elements.confirmStatus.textContent = "Saving final order, payment placeholder, and tracking state...";

  try {
    const order = await createOrder({
      buyer: {
        name: buyerName,
        phoneNumber: buyerPhone,
        address: buyerAddress,
      },
      request: {
        ...state.currentRequest,
        address: buyerAddress,
      },
      offer: state.selectedOffer,
    });

    state.currentOrder = order;
    elements.activeRequestBadge.textContent = `Order in progress: ${order.product.name}`;
    elements.requestStatus.textContent =
      "Order confirmed. Track payment and delivery below. A new request opens after this order arrives.";
    elements.confirmStatus.textContent = `Order ${order.id} created with ${order.seller.name}. This order stays active until it arrives.`;
    renderMarketplaceState();
    switchTab("buyer-panel");
  } catch (error) {
    console.error(error);
    elements.confirmStatus.textContent =
      "The order could not be saved. Check your Firebase setup or try local demo mode.";
  } finally {
    elements.confirmOrderButton.disabled = !state.selectedOffer || hasActiveOrder();
  }
}

async function handlePaymentActionClick(event) {
  const button = event.target.closest("[data-payment-action]");
  if (!button || !state.currentOrder) {
    return;
  }

  const status = button.getAttribute("data-payment-action");
  togglePaymentButtons(true);
  elements.paymentStatusText.textContent = `Updating payment to ${formatStatusLabel(status)}...`;

  try {
    const updatedOrder = await updateOrderPaymentStatus(state.currentOrder.id, status);
    state.currentOrder = updatedOrder;
    elements.paymentStatusText.textContent = `Payment is now ${formatStatusLabel(
      updatedOrder.paymentStatus
    )}. Order payment state is saved.`;
    renderPaymentPanel();
    renderSellerTabs();
  } catch (error) {
    console.error(error);
    elements.paymentStatusText.textContent =
      "Payment update failed. Check your storage setup and try again.";
  } finally {
    togglePaymentButtons(false);
  }
}

async function handleSellerFulfillmentAction(button) {
  if (!state.currentOrder) {
    return;
  }

  const fulfillmentStatus = button.getAttribute("data-fulfillment-action");
  const sellerId = button.getAttribute("data-seller-id");

  if (!fulfillmentStatus || sellerId !== state.currentOrder.seller.id) {
    return;
  }

  button.disabled = true;

  try {
    const updatedOrder = await updateOrderFulfillmentStatus(
      state.currentOrder.id,
      fulfillmentStatus
    );

    state.currentOrder = updatedOrder;
    addNotification({
      audienceType: "buyer",
      title: `${updatedOrder.seller.name} updated your order`,
      body: `Order is now ${formatStatusLabel(updatedOrder.fulfillmentStatus)}.`,
      kind: "order-status",
      orderId: updatedOrder.id,
    });

    if (isOrderCompleted(updatedOrder)) {
      completeCurrentOrderAndReset(updatedOrder);
      return;
    }

    renderPaymentPanel();
    renderSellerTabs();
  } catch (error) {
    console.error(error);
  } finally {
    button.disabled = false;
  }
}

function togglePaymentButtons(disabled) {
  elements.paymentActions.querySelectorAll("[data-payment-action]").forEach((button) => {
    button.disabled = disabled;
  });
}

function handleSellerRevisionSubmit(form) {
  if (!state.currentRequest) {
    return;
  }

  const sellerId = form.dataset.sellerId;
  const baseOffer = getBaseOfferBySellerId(sellerId);
  const currentOffer = baseOffer ? buildEffectiveOffer(baseOffer) : null;
  const priceInput = form.querySelector("[data-revision-price]");
  const noteInput = form.querySelector("[data-revision-note]");
  const revisedUnitPrice = Number(priceInput?.value) || 0;
  const seller = state.sellers.find((item) => item.id === sellerId);

  if (!currentOffer || revisedUnitPrice <= 0) {
    return;
  }

  const revisedOffer = {
    unitPrice: revisedUnitPrice,
    quantity: Number(currentOffer.quantity) || 1,
    totalPrice: revisedUnitPrice * (Number(currentOffer.quantity) || 1),
    replyText:
      noteInput?.value.trim() ||
      `I can revise it to ${formatCurrency(revisedUnitPrice * (Number(currentOffer.quantity) || 1))}.`,
    badges: [...new Set([...(currentOffer.badges || []), "revised offer"])],
    reasons: currentOffer.reasons || [],
  };

  addChatMessage({
    requestId: state.currentRequest.id,
    sellerId,
    senderType: "seller",
    senderId: sellerId,
    senderLabel: seller?.name || "Seller",
    text: revisedOffer.replyText,
    metadata: {
      kind: "offer-revision",
      offerSnapshot: revisedOffer,
    },
  });

  addNotification({
    audienceType: "buyer",
    title: `${seller?.name || "Seller"} revised the offer`,
    body: `${revisedOffer.replyText} New total ${formatCurrency(revisedOffer.totalPrice)}.`,
    kind: "offer-revision",
    requestId: state.currentRequest.id,
  });

  if (priceInput) {
    priceInput.value = "";
  }
  if (noteInput) {
    noteInput.value = "";
  }
}

function handleChatFormSubmit(form) {
  if (!state.currentRequest) {
    return;
  }

  const sellerId = form.dataset.sellerId;
  const input = form.querySelector("[data-chat-input]");
  const messageText = input?.value.trim();
  const selectedSellerId = getSelectedChatSellerId();

  if (!messageText || !sellerId) {
    return;
  }

  if (selectedSellerId && selectedSellerId !== sellerId) {
    elements.confirmStatus.textContent =
      "Chat is now locked to the selected seller. Change the chosen offer to switch the active chat.";
    return;
  }

  const isBuyerMessage = form.dataset.chatForm === "buyer";
  const seller = state.sellers.find((item) => item.id === sellerId);

  addChatMessage({
    requestId: state.currentRequest.id,
    sellerId,
    senderType: isBuyerMessage ? "buyer" : "seller",
    senderId: isBuyerMessage ? "buyer-active" : sellerId,
    senderLabel: isBuyerMessage
      ? elements.confirmBuyerName.value.trim() || "Buyer"
      : seller?.name || "Seller",
    text: messageText,
  });

  addNotification(
    isBuyerMessage
      ? {
          audienceType: "seller",
          sellerId,
          title: "New buyer message",
          body: messageText,
          kind: "chat",
          requestId: state.currentRequest.id,
        }
      : {
          audienceType: "buyer",
          title: `${seller?.name || "Seller"} sent a message`,
          body: messageText,
          kind: "chat",
          requestId: state.currentRequest.id,
        }
  );

  input.value = "";
}
