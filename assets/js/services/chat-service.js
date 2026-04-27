const CHAT_STORAGE_KEY = "uos-chat-threads";
const CHAT_EVENT_NAME = "uos-chat-updated";

function formatAmount(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeChatStore(value) {
  if (!value || typeof value !== "object") {
    return { threads: {} };
  }

  return {
    threads: value.threads && typeof value.threads === "object" ? value.threads : {},
  };
}

function readChatStore() {
  try {
    const rawValue = localStorage.getItem(CHAT_STORAGE_KEY);
    return rawValue ? normalizeChatStore(JSON.parse(rawValue)) : { threads: {} };
  } catch (error) {
    console.warn("Chat storage could not be read. Resetting local chat state.", error);
    return { threads: {} };
  }
}

function writeChatStore(value) {
  const safeValue = normalizeChatStore(value);
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(safeValue));
  window.dispatchEvent(
    new CustomEvent(CHAT_EVENT_NAME, {
      detail: clone(safeValue),
    })
  );
}

function buildThread(requestId, sellerIds = []) {
  return {
    requestId,
    selectedSellerId: null,
    sellerIds: [...new Set(sellerIds.filter(Boolean))],
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function updateThread(requestId, updater) {
  const store = readChatStore();
  const existingThread = store.threads[requestId] || buildThread(requestId);
  const nextThread = updater(clone(existingThread));

  store.threads[requestId] = {
    ...existingThread,
    ...nextThread,
    updatedAt: new Date().toISOString(),
  };

  writeChatStore(store);
  return clone(store.threads[requestId]);
}

export function getChatThread(requestId) {
  const store = readChatStore();
  return requestId ? clone(store.threads[requestId] || null) : null;
}

export function ensureChatThread({ requestId, sellerIds = [], resetSelection = false }) {
  if (!requestId) {
    return null;
  }

  return updateThread(requestId, (thread) => {
    return {
      ...thread,
      sellerIds: [...new Set([...(thread.sellerIds || []), ...sellerIds.filter(Boolean)])],
      messages: thread.messages || [],
      selectedSellerId: resetSelection ? null : thread.selectedSellerId || null,
    };
  });
}

export function setSelectedSellerForChat(requestId, sellerId) {
  if (!requestId) {
    return null;
  }

  return updateThread(requestId, (thread) => {
    return {
      ...thread,
      selectedSellerId: sellerId || null,
    };
  });
}

export function addChatMessage({
  requestId,
  sellerId,
  senderType,
  senderId,
  senderLabel,
  text,
  metadata = {},
}) {
  if (!requestId || !sellerId || !text?.trim()) {
    return null;
  }

  return updateThread(requestId, (thread) => {
    const message = {
      id: `chat-${crypto.randomUUID().slice(0, 8)}`,
      requestId,
      sellerId,
      senderType,
      senderId,
      senderLabel,
      text: text.trim(),
      metadata,
      createdAt: new Date().toISOString(),
    };

    return {
      ...thread,
      sellerIds: [...new Set([...(thread.sellerIds || []), sellerId])],
      messages: [...(thread.messages || []), message],
    };
  });
}

export function syncOfferMessages({ requestId, offers = [] }) {
  if (!requestId || !offers.length) {
    return null;
  }

  return updateThread(requestId, (thread) => {
    const existingOfferIds = new Set(
      (thread.messages || [])
        .filter((message) => message.metadata?.kind === "offer-intro")
        .map((message) => message.metadata.offerId)
    );
    const nextMessages = [...(thread.messages || [])];

    offers.forEach((offer) => {
      if (existingOfferIds.has(offer.id) || !offer.seller?.id) {
        return;
      }

      nextMessages.push({
        id: `chat-offer-${offer.id}`,
        requestId,
        sellerId: offer.seller.id,
        senderType: "seller",
        senderId: offer.seller.id,
        senderLabel: offer.seller.name,
        text: `${offer.replyText} Total ${formatAmount(offer.totalPrice)}.`,
        metadata: {
          kind: "offer-intro",
          offerId: offer.id,
        },
        createdAt: new Date().toISOString(),
      });
    });

    return {
      ...thread,
      sellerIds: [
        ...new Set([
          ...(thread.sellerIds || []),
          ...offers.map((offer) => offer.seller?.id).filter(Boolean),
        ]),
      ],
      messages: nextMessages,
    };
  });
}

export function listThreadMessages(requestId, sellerId) {
  const thread = getChatThread(requestId);
  if (!thread) {
    return [];
  }

  return (thread.messages || []).filter((message) => message.sellerId === sellerId);
}

export function subscribeToChatChanges(listener) {
  const handleStorage = (event) => {
    if (event.key && event.key !== CHAT_STORAGE_KEY) {
      return;
    }

    try {
      listener(normalizeChatStore(event.newValue ? JSON.parse(event.newValue) : readChatStore()));
    } catch (error) {
      console.warn("Chat sync event could not be parsed.", error);
      listener(readChatStore());
    }
  };
  const handleLocalUpdate = () => {
    listener(readChatStore());
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHAT_EVENT_NAME, handleLocalUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHAT_EVENT_NAME, handleLocalUpdate);
  };
}
