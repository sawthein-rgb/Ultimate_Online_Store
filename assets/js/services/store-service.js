import { firebaseConfig, isFirebaseConfigured } from "../config/firebase-config.js";
import { sampleCollections } from "../data/sample-data.js";
import { normalizeTagList, slugify } from "../utils/formatters.js";

const COLLECTIONS = [
  "buyers",
  "sellers",
  "products",
  "requests",
  "offers",
  "orders",
  "payments",
  "history",
];

const SEEDABLE_COLLECTIONS = ["buyers", "sellers", "products"];
const COLLECTION_EVENT_NAME = "uos-collection-updated";

const storeState = {
  initialized: false,
  mode: "local-demo",
  db: null,
  firebase: null,
  lastError: null,
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function localKey(collectionName) {
  return `uos-${collectionName}`;
}

function readLocalCollection(collectionName) {
  const rawValue = localStorage.getItem(localKey(collectionName));
  return rawValue ? JSON.parse(rawValue) : [];
}

function writeLocalCollection(collectionName, records) {
  localStorage.setItem(localKey(collectionName), JSON.stringify(records));
  window.dispatchEvent(
    new CustomEvent(COLLECTION_EVENT_NAME, {
      detail: {
        collectionName,
        records: clone(records),
      },
    })
  );
}

function sortByName(records) {
  return [...records].sort((left, right) => {
    const leftSlot = Number(left.marketplaceSlot || 999);
    const rightSlot = Number(right.marketplaceSlot || 999);

    return leftSlot - rightSlot || String(left.name || "").localeCompare(String(right.name || ""));
  });
}

function sortByNewest(records) {
  return [...records].sort((left, right) => {
    return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
  });
}

function buildCollectionRecord(collectionName, records) {
  if (["requests", "offers", "orders", "payments", "history"].includes(collectionName)) {
    return sortByNewest(records);
  }

  if (["products", "sellers"].includes(collectionName)) {
    return sortByName(records);
  }

  return records;
}

function ensureLocalSeedData() {
  const hasProducts = readLocalCollection("products").length > 0;

  if (hasProducts) {
    COLLECTIONS.forEach((collectionName) => {
      if (!readLocalCollection(collectionName).length && sampleCollections[collectionName]) {
        writeLocalCollection(collectionName, clone(sampleCollections[collectionName]));
      }
    });
    return;
  }

  Object.entries(sampleCollections).forEach(([collectionName, records]) => {
    writeLocalCollection(collectionName, clone(records));
  });
}

async function loadFirebaseTools() {
  const [appTools, firestoreTools] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js"),
  ]);

  return {
    initializeApp: appTools.initializeApp,
    getApps: appTools.getApps,
    getFirestore: firestoreTools.getFirestore,
    collection: firestoreTools.collection,
    getDocs: firestoreTools.getDocs,
    onSnapshot: firestoreTools.onSnapshot,
    doc: firestoreTools.doc,
    setDoc: firestoreTools.setDoc,
  };
}

export async function initStore() {
  if (storeState.initialized) {
    return getStoreStatus();
  }

  if (!isFirebaseConfigured()) {
    ensureLocalSeedData();
    storeState.mode = "local-demo";
    storeState.initialized = true;
    return getStoreStatus();
  }

  try {
    const firebase = await loadFirebaseTools();
    const existingApp = firebase.getApps()[0];
    const app = existingApp || firebase.initializeApp(firebaseConfig);

    storeState.firebase = firebase;
    storeState.db = firebase.getFirestore(app);
    storeState.mode = "firestore";
  } catch (error) {
    console.warn("Firebase could not be loaded. Falling back to local demo mode.", error);
    ensureLocalSeedData();
    storeState.mode = "local-demo";
    storeState.lastError = error;
  }

  storeState.initialized = true;
  return getStoreStatus();
}

export function getStoreStatus() {
  return {
    mode: storeState.mode,
    lastError: storeState.lastError,
  };
}

async function readCollection(collectionName) {
  await initStore();

  if (storeState.mode === "firestore") {
    const snapshot = await storeState.firebase.getDocs(
      storeState.firebase.collection(storeState.db, collectionName)
    );

    return buildCollectionRecord(
      collectionName,
      snapshot.docs.map((document) => document.data())
    );
  }

  return buildCollectionRecord(collectionName, readLocalCollection(collectionName));
}

async function saveRecord(collectionName, record, preferredId = null) {
  await initStore();

  if (storeState.mode === "firestore") {
    const collectionRef = storeState.firebase.collection(storeState.db, collectionName);
    const documentRef = preferredId
      ? storeState.firebase.doc(storeState.db, collectionName, preferredId)
      : storeState.firebase.doc(collectionRef);

    const savedRecord = {
      ...record,
      id: preferredId || record.id || documentRef.id,
    };

    await storeState.firebase.setDoc(documentRef, savedRecord, { merge: true });
    return savedRecord;
  }

  const savedRecord = {
    ...record,
    id: preferredId || record.id || `${collectionName}-${crypto.randomUUID().slice(0, 8)}`,
  };

  const records = readLocalCollection(collectionName);
  const existingIndex = records.findIndex((item) => item.id === savedRecord.id);

  if (existingIndex >= 0) {
    records[existingIndex] = { ...records[existingIndex], ...savedRecord };
  } else {
    records.unshift(savedRecord);
  }

  writeLocalCollection(collectionName, records);
  return savedRecord;
}

function buildHistoryRecord(type, note, extra = {}) {
  const now = new Date().toISOString();

  return {
    id: `history-${crypto.randomUUID().slice(0, 8)}`,
    type,
    note,
    ...extra,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listProducts() {
  return readCollection("products");
}

export async function listSellers() {
  return readCollection("sellers");
}

export async function listRequests() {
  return readCollection("requests");
}

export async function listOffers() {
  return readCollection("offers");
}

export async function listOrders() {
  return readCollection("orders");
}

export async function listHistory() {
  return readCollection("history");
}

export async function listPayments() {
  return readCollection("payments");
}

export async function getCollectionCounts() {
  const entries = await Promise.all(
    COLLECTIONS.map(async (collectionName) => [collectionName, (await readCollection(collectionName)).length])
  );

  return Object.fromEntries(entries);
}

export async function subscribeToCollectionChanges(collectionName, listener) {
  await initStore();

  if (storeState.mode === "firestore") {
    const collectionRef = storeState.firebase.collection(storeState.db, collectionName);
    const unsubscribe = storeState.firebase.onSnapshot(collectionRef, (snapshot) => {
      const records = snapshot.docs.map((document) => document.data());
      listener(buildCollectionRecord(collectionName, records));
    });

    return unsubscribe;
  }

  const handleStorage = (event) => {
    if (event.key && event.key !== localKey(collectionName)) {
      return;
    }

    try {
      const records = event.newValue ? JSON.parse(event.newValue) : readLocalCollection(collectionName);
      listener(buildCollectionRecord(collectionName, records));
    } catch (error) {
      console.warn(`Collection sync for ${collectionName} could not be parsed.`, error);
      listener(buildCollectionRecord(collectionName, readLocalCollection(collectionName)));
    }
  };

  const handleLocalUpdate = (event) => {
    if (event.detail?.collectionName !== collectionName) {
      return;
    }

    listener(buildCollectionRecord(collectionName, event.detail.records || readLocalCollection(collectionName)));
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(COLLECTION_EVENT_NAME, handleLocalUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(COLLECTION_EVENT_NAME, handleLocalUpdate);
  };
}

export async function seedSampleData() {
  await initStore();

  for (const collectionName of SEEDABLE_COLLECTIONS) {
    for (const record of sampleCollections[collectionName]) {
      await saveRecord(collectionName, record, record.id);
    }
  }

  return {
    sellers: sampleCollections.sellers.length,
    products: sampleCollections.products.length,
  };
}

export async function saveSeller(input) {
  const now = new Date().toISOString();
  const existingSellers = await listSellers();
  const usedSlots = new Set(
    existingSellers.map((seller) => Number(seller.marketplaceSlot)).filter(Boolean)
  );
  const nextSlot = [1, 2, 3].find((slot) => !usedSlots.has(slot)) || null;
  const sellerId =
    input.id || `seller-${slugify(input.name)}-${crypto.randomUUID().slice(0, 6)}`;

  const seller = {
    id: sellerId,
    name: input.name.trim(),
    marketplaceSlot: input.marketplaceSlot ? Number(input.marketplaceSlot) : nextSlot,
    phoneNumber: input.phoneNumber.trim(),
    address: input.address.trim(),
    location:
      Number(input.locationLat) && Number(input.locationLng)
        ? {
            lat: Number(input.locationLat),
            lng: Number(input.locationLng),
          }
        : input.location?.lat && input.location?.lng
          ? {
              lat: Number(input.location.lat),
              lng: Number(input.location.lng),
            }
          : null,
    rating: Number(input.rating) || 4.5,
    shortVideo: input.shortVideo?.trim() || "",
    tagline: input.tagline?.trim() || "",
    createdAt: input.createdAt || now,
    updatedAt: now,
  };

  await saveRecord("sellers", seller, seller.id);
  return seller;
}

export async function saveProduct(input) {
  const now = new Date().toISOString();
  const sellers = await listSellers();
  const seller = sellers.find((item) => item.id === input.sellerId);

  const product = {
    id: input.id || `prod-${slugify(input.name)}-${crypto.randomUUID().slice(0, 6)}`,
    name: input.name.trim(),
    price: Number(input.price) || 0,
    category: input.category.trim().toLowerCase(),
    sellerId: input.sellerId,
    sellerContact: seller?.phoneNumber || "",
    description: input.description?.trim() || "",
    sizeLabel: input.sizeLabel?.trim() || "",
    volumeMl: Number(input.volumeMl) || null,
    weightGram: Number(input.weightGram) || null,
    mediaUrl: input.mediaUrl?.trim() || "",
    tags: normalizeTagList(input.tags),
    temperature: input.temperature || "",
    prepMinutes: Number(input.prepMinutes) || 10,
    createdAt: input.createdAt || now,
    updatedAt: now,
  };

  await saveRecord("products", product, product.id);
  return product;
}

export async function createRequestRecord({ query, quantity, budget, address, ranking, parsedRequest }) {
  const now = new Date().toISOString();
  const requestId = `request-${crypto.randomUUID().slice(0, 8)}`;

  const requestRecord = {
    id: requestId,
    query: query.trim(),
    quantity: Number(quantity) || 1,
    budget: Number(budget) || null,
    address: address?.trim() || "",
    ranking: ranking || parsedRequest.ranking || "best-match",
    resolved: false,
    parsedRequest,
    createdAt: now,
    updatedAt: now,
  };

  await saveRecord("requests", requestRecord, requestId);
  await saveRecord(
    "history",
    buildHistoryRecord("request_created", `Buyer request submitted: ${requestRecord.query}`, {
      requestId,
    }),
    `history-request-${requestId}`
  );

  return requestRecord;
}

export async function saveOfferRecords({ request, offers }) {
  const savedOffers = [];
  const now = new Date().toISOString();

  for (const offer of offers) {
    const offerId = `offer-${request.id}-${offer.seller.marketplaceSlot || offer.seller.id}`;
    const offerRecord = {
      id: offerId,
      requestId: request.id,
      seller: {
        id: offer.seller.id,
        name: offer.seller.name,
        marketplaceSlot: offer.seller.marketplaceSlot || null,
        phoneNumber: offer.seller.phoneNumber,
        address: offer.seller.address,
        location: offer.seller.location || null,
        rating: offer.seller.rating,
        shortVideo: offer.seller.shortVideo || "",
        tagline: offer.seller.tagline || "",
      },
      product: {
        id: offer.product.id,
        name: offer.product.name,
        price: offer.product.price,
        category: offer.product.category,
        sizeLabel: offer.product.sizeLabel || "",
        volumeMl: offer.product.volumeMl || null,
        weightGram: offer.product.weightGram || null,
        temperature: offer.product.temperature || "",
        prepMinutes: offer.product.prepMinutes || 10,
      },
      quantity: Number(offer.quantity) || 1,
      unitPrice: Number(offer.unitPrice) || 0,
      totalPrice: Number(offer.totalPrice) || 0,
      score: Number(offer.score) || 0,
      reasons: offer.reasons || [],
      badges: offer.badges || [],
      replyText: offer.replyText || "",
      matchType: offer.matchType || "match",
      ranking: request.ranking,
      createdAt: now,
      updatedAt: now,
    };

    savedOffers.push(await saveRecord("offers", offerRecord, offerId));
  }

  await saveRecord(
    "history",
    buildHistoryRecord("offers_generated", `${savedOffers.length} seller offers generated`, {
      requestId: request.id,
      offerCount: savedOffers.length,
    }),
    `history-offers-${request.id}`
  );

  return savedOffers;
}

export async function createOrder({ buyer, request, offer }) {
  const now = new Date().toISOString();
  const buyerId =
    buyer.id || `buyer-${slugify(buyer.name || "guest")}-${crypto.randomUUID().slice(0, 6)}`;
  const orderId = `order-${crypto.randomUUID().slice(0, 8)}`;
  const paymentId = `payment-${orderId}`;

  const buyerRecord = {
    id: buyerId,
    name: buyer.name.trim(),
    phoneNumber: buyer.phoneNumber.trim(),
    address: buyer.address.trim(),
    preference: request.parsedRequest?.desiredTags || [],
    createdAt: now,
    updatedAt: now,
  };

  await saveRecord("buyers", buyerRecord, buyerId);

  const orderRecord = {
    id: orderId,
    requestId: request.id,
    offerId: offer.id,
    paymentId,
    query: request.query,
    ranking: request.ranking,
    buyer: buyerRecord,
    seller: offer.seller,
    product: {
      ...offer.product,
      price: offer.unitPrice,
    },
    quantity: Number(offer.quantity),
    unitPrice: Number(offer.unitPrice),
    totalPrice: Number(offer.totalPrice),
    reasons: offer.reasons || [],
    badges: offer.badges || [],
    status: "awaiting-payment",
    paymentStatus: "pending",
    fulfillmentStatus: "confirmed",
    createdAt: now,
    updatedAt: now,
  };

  await saveRecord("orders", orderRecord, orderId);
  await saveRecord(
    "payments",
    {
      id: paymentId,
      orderId,
      requestId: request.id,
      offerId: offer.id,
      buyerId,
      sellerId: offer.seller.id,
      sellerName: offer.seller.name,
      amount: Number(offer.totalPrice),
      method: "demo-simulation",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    },
    paymentId
  );
  await saveRecord(
    "requests",
    {
      id: request.id,
      resolved: true,
      resolvedAt: now,
      updatedAt: now,
    },
    request.id
  );
  await saveRecord(
    "history",
    buildHistoryRecord(
      "order_confirmed",
      `Order created with ${offer.seller.name} for ${offer.product.name} and is waiting for payment`,
      {
        requestId: request.id,
        offerId: offer.id,
        orderId,
      }
    ),
    `history-order-${orderId}`
  );

  return orderRecord;
}

export async function updateOrderPaymentStatus(orderId, paymentStatus) {
  const now = new Date().toISOString();
  const orders = await listOrders();
  const order = orders.find((item) => item.id === orderId);

  if (!order) {
    throw new Error(`Order ${orderId} was not found.`);
  }

  const normalizedStatus = ["pending", "paid", "failed"].includes(paymentStatus)
    ? paymentStatus
    : "pending";
  const nextOrderStatus =
    normalizedStatus === "paid"
      ? "paid"
      : normalizedStatus === "failed"
        ? "payment-failed"
        : "awaiting-payment";

  const updatedOrder = {
    ...order,
    paymentStatus: normalizedStatus,
    status: nextOrderStatus,
    paidAt: normalizedStatus === "paid" ? now : null,
    updatedAt: now,
  };

  await saveRecord("orders", updatedOrder, orderId);
  await saveRecord(
    "payments",
    {
      id: order.paymentId || `payment-${orderId}`,
      orderId,
      requestId: order.requestId,
      offerId: order.offerId,
      buyerId: order.buyer.id,
      sellerId: order.seller.id,
      sellerName: order.seller.name,
      amount: Number(order.totalPrice),
      method: "demo-simulation",
      status: normalizedStatus,
      createdAt: order.createdAt,
      updatedAt: now,
    },
    order.paymentId || `payment-${orderId}`
  );
  await saveRecord(
    "history",
    buildHistoryRecord(
      "payment_updated",
      `Payment changed to ${normalizedStatus} for order ${orderId}`,
      {
        requestId: order.requestId,
        offerId: order.offerId,
        orderId,
        paymentStatus: normalizedStatus,
      }
    )
  );

  return updatedOrder;
}

export async function updateOrderFulfillmentStatus(orderId, fulfillmentStatus) {
  const now = new Date().toISOString();
  const orders = await listOrders();
  const order = orders.find((item) => item.id === orderId);

  if (!order) {
    throw new Error(`Order ${orderId} was not found.`);
  }

  const normalizedStatus = ["confirmed", "cooking", "on-the-way", "arrived"].includes(
    fulfillmentStatus
  )
    ? fulfillmentStatus
    : "confirmed";
  const updatedOrder = {
    ...order,
    fulfillmentStatus: normalizedStatus,
    updatedAt: now,
  };

  await saveRecord("orders", updatedOrder, orderId);
  await saveRecord(
    "history",
    buildHistoryRecord(
      "order_tracking_updated",
      `Order ${orderId} moved to ${normalizedStatus}`,
      {
        requestId: order.requestId,
        offerId: order.offerId,
        orderId,
        fulfillmentStatus: normalizedStatus,
      }
    )
  );

  return updatedOrder;
}
