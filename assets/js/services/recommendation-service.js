const TAG_GROUPS = {
  sweet: ["sweet", "manis", "dessert"],
  light: ["light", "ringan", "lite"],
  fresh: ["fresh", "segar", "refreshing"],
  energizing: ["energizing", "energy", "energetic", "boost", "stamina"],
  cheap: ["cheap", "cheapest", "murah", "budget", "hemat", "affordable"],
  simple: ["simple", "fast", "easy", "praktis", "quick", "cepat"],
  "long-lasting": ["long-lasting", "lasting", "tahan", "filling", "awet"],
};

const TEMPERATURE_GROUPS = {
  hot: ["hot", "warm", "panas", "hangat"],
  cold: ["cold", "iced", "ice", "chilled", "dingin", "es"],
};

const RANKING_HINTS = {
  cheapest: ["cheap", "cheapest", "murah", "budget", "hemat", "termurah"],
  simple: ["simple", "fast", "quick", "easy", "praktis", "cepat", "mudah"],
  "best-match": ["best", "match", "cocok", "recommend", "recommended"],
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "the",
  "something",
  "i",
  "want",
  "need",
  "for",
  "with",
  "please",
  "show",
  "me",
  "yang",
  "dan",
  "saya",
  "mau",
  "ingin",
  "cari",
  "butuh",
]);

function includesAny(text, options) {
  return options.some((option) => text.includes(option));
}

function parseMoneyValue(rawNumber, suffix = "") {
  const normalized = String(rawNumber || "0").replace(",", ".").trim();
  const parsed = Number(normalized);

  if (!parsed) {
    return null;
  }

  if (["k", "rb", "ribu"].includes(suffix.toLowerCase())) {
    return parsed * 1000;
  }

  return parsed;
}

function parseQuantity(text, excludedSnippets) {
  const explicitQuantity = text.match(
    /(?:qty|quantity|jumlah|for|x)\s*(\d+)|(\d+)\s*(?:pcs?|items?|cups?|boxes?|porsi|portion|servings?)/i
  );

  if (explicitQuantity) {
    return Number(explicitQuantity[1] || explicitQuantity[2] || 1);
  }

  let stripped = text;
  excludedSnippets.forEach((snippet) => {
    stripped = stripped.replace(snippet, " ");
  });

  const standaloneNumbers = [...stripped.matchAll(/\b(\d+)\b/g)].map((match) => Number(match[1]));
  return standaloneNumbers.at(-1) || 1;
}

function parseMinimumPortion(text) {
  const match = text.match(
    /(?:min(?:imum)?|at least|minimal|>=?)\s*(\d+(?:[.,]\d+)?)\s*(ml|l|g|gr|gram|kg)/i
  );

  if (!match) {
    return null;
  }

  const rawValue = Number(match[1].replace(",", "."));
  const unit = match[2].toLowerCase();

  if (unit === "l") {
    return { value: rawValue * 1000, unit: "ml" };
  }

  if (unit === "kg") {
    return { value: rawValue * 1000, unit: "g" };
  }

  return { value: rawValue, unit: unit === "gr" || unit === "gram" ? "g" : unit };
}

function extractSearchTerms(text) {
  return text
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term && term.length > 1 && !STOP_WORDS.has(term));
}

function getPortionValue(product, unit) {
  if (unit === "ml") {
    return Number(product.volumeMl) || 0;
  }

  if (unit === "g") {
    return Number(product.weightGram) || 0;
  }

  return 0;
}

function scoreProduct(product, seller, parsedRequest, strictBudget) {
  const haystack = [
    product.name,
    product.category,
    product.description,
    ...(product.tags || []),
    seller?.name || "",
    seller?.tagline || "",
  ]
    .join(" ")
    .toLowerCase();
  const totalPrice = Number(product.price) * Number(parsedRequest.quantity || 1);

  if (parsedRequest.minPortion) {
    const portionValue = getPortionValue(product, parsedRequest.minPortion.unit);
    if (portionValue && portionValue < parsedRequest.minPortion.value) {
      return null;
    }
  }

  if (strictBudget && parsedRequest.maxPrice && totalPrice > parsedRequest.maxPrice) {
    return null;
  }

  let score = 1;
  const reasons = [];

  parsedRequest.desiredTags.forEach((tag) => {
    if ((product.tags || []).includes(tag)) {
      score += 4;
      reasons.push(tag);
    }
  });

  if (parsedRequest.temperature) {
    if (product.temperature === parsedRequest.temperature) {
      score += 3;
      reasons.push(parsedRequest.temperature);
    } else {
      score -= 1;
    }
  }

  parsedRequest.searchTerms.forEach((term) => {
    if (product.name.toLowerCase().includes(term)) {
      score += 4;
      reasons.push(`matched "${term}"`);
    } else if (haystack.includes(term)) {
      score += 2;
    }
  });

  if (parsedRequest.searchPhrase && product.name.toLowerCase().includes(parsedRequest.searchPhrase)) {
    score += 5;
    reasons.push("strong name match");
  }

  if (parsedRequest.maxPrice && totalPrice <= parsedRequest.maxPrice) {
    score += 2;
    reasons.push("within budget");
  }

  score += Number(seller?.rating || 0) * 0.4;

  if (parsedRequest.ranking === "cheapest") {
    score += Math.max(0, 28 - totalPrice / 1000);
  }

  if (parsedRequest.ranking === "simple") {
    score += Math.max(0, 14 - Number(product.prepMinutes || 12));
    if ((product.tags || []).includes("simple")) {
      reasons.push("simple");
    }
  }

  if (!strictBudget && parsedRequest.maxPrice && totalPrice > parsedRequest.maxPrice) {
    score -= Math.min(6, (totalPrice - parsedRequest.maxPrice) / 2000);
    reasons.push("near budget");
  }

  return {
    product,
    seller,
    score,
    reasons: [...new Set(reasons)],
    totalPrice,
  };
}

function sortRecommendations(items, ranking) {
  const sorted = [...items];

  if (ranking === "cheapest") {
    return sorted.sort((left, right) => {
      const unavailableDiff =
        Number(left.matchType === "unavailable") - Number(right.matchType === "unavailable");
      if (unavailableDiff !== 0) {
        return unavailableDiff;
      }

      return (
        Number(left.totalPrice) - Number(right.totalPrice) ||
        right.score - left.score ||
        Number(left.product.prepMinutes || 99) - Number(right.product.prepMinutes || 99)
      );
    });
  }

  if (ranking === "simple") {
    return sorted.sort((left, right) => {
      const unavailableDiff =
        Number(left.matchType === "unavailable") - Number(right.matchType === "unavailable");
      if (unavailableDiff !== 0) {
        return unavailableDiff;
      }

      return (
        Number(left.product.prepMinutes || 99) - Number(right.product.prepMinutes || 99) ||
        right.score - left.score ||
        Number(left.totalPrice) - Number(right.totalPrice)
      );
    });
  }

  return sorted.sort((left, right) => {
    const unavailableDiff =
      Number(left.matchType === "unavailable") - Number(right.matchType === "unavailable");
    if (unavailableDiff !== 0) {
      return unavailableDiff;
    }

    return right.score - left.score || Number(left.totalPrice) - Number(right.totalPrice);
  });
}

function chooseFallbackProduct(products, ranking) {
  const sorted = [...products];

  if (ranking === "simple") {
    return sorted.sort((left, right) => {
      return (
        Number(left.prepMinutes || 99) - Number(right.prepMinutes || 99) ||
        Number(left.price) - Number(right.price)
      );
    })[0];
  }

  return sorted.sort((left, right) => Number(left.price) - Number(right.price))[0];
}

function pickMarketplaceSellers(sellers, limit = 3) {
  const withSlot = sellers
    .filter((seller) => Number(seller.marketplaceSlot))
    .sort((left, right) => Number(left.marketplaceSlot) - Number(right.marketplaceSlot));
  const withoutSlot = sellers
    .filter((seller) => !Number(seller.marketplaceSlot))
    .sort((left, right) => String(left.name).localeCompare(String(right.name)));

  return [...withSlot, ...withoutSlot].slice(0, limit).map((seller, index) => {
    return {
      ...seller,
      marketplaceSlot: Number(seller.marketplaceSlot) || index + 1,
    };
  });
}

function buildReplyText(offer) {
  const reasonText = offer.reasons.length
    ? offer.reasons.slice(0, 3).join(", ")
    : "seller fallback option";

  return `${offer.seller.name} offers ${offer.product.name} because it fits ${reasonText}.`;
}

function applyOfferBadges(offers) {
  if (!offers.length) {
    return offers;
  }

  const eligibleOffers = offers.filter((offer) => offer.matchType !== "unavailable");

  if (!eligibleOffers.length) {
    return offers;
  }

  const cheapest = [...eligibleOffers].sort((left, right) => left.totalPrice - right.totalPrice)[0];
  const fastest = [...eligibleOffers].sort(
    (left, right) => Number(left.product.prepMinutes || 99) - Number(right.product.prepMinutes || 99)
  )[0];
  const bestMatch = [...eligibleOffers].sort((left, right) => right.score - left.score)[0];

  return offers.map((offer) => {
    const badges = [...(offer.badges || [])];

    if (offer.seller.id === cheapest.seller.id) {
      badges.push("Cheapest");
    }

    if (offer.seller.id === fastest.seller.id) {
      badges.push("Fastest");
    }

    if (offer.seller.id === bestMatch.seller.id) {
      badges.push("Best match");
    }

    return {
      ...offer,
      badges: [...new Set(badges)],
      replyText: buildReplyText(offer),
    };
  });
}

export function parseBuyerRequest(query) {
  const loweredQuery = String(query || "").toLowerCase().trim();
  const budgetMatch = loweredQuery.match(
    /(?:max|under|below|budget|up to|maks(?:imal)?|dibawah|di bawah)\s*(\d+(?:[.,]\d+)?)\s*(k|rb|ribu)?/i
  );
  const minimumPortion = parseMinimumPortion(loweredQuery);
  const excludedSnippets = [];

  if (budgetMatch) {
    excludedSnippets.push(budgetMatch[0]);
  }

  if (minimumPortion) {
    const portionMatch = loweredQuery.match(
      /(?:min(?:imum)?|at least|minimal|>=?)\s*(\d+(?:[.,]\d+)?)\s*(ml|l|g|gr|gram|kg)/i
    );

    if (portionMatch) {
      excludedSnippets.push(portionMatch[0]);
    }
  }

  const desiredTags = Object.keys(TAG_GROUPS).filter((tag) => includesAny(loweredQuery, TAG_GROUPS[tag]));
  const temperature =
    Object.keys(TEMPERATURE_GROUPS).find((key) => includesAny(loweredQuery, TEMPERATURE_GROUPS[key])) || "";
  const ranking =
    Object.keys(RANKING_HINTS).find((key) => includesAny(loweredQuery, RANKING_HINTS[key])) || "best-match";
  const quantity = parseQuantity(loweredQuery, excludedSnippets);
  const searchTerms = extractSearchTerms(loweredQuery).filter((term) => {
    const inTagGroups = Object.values(TAG_GROUPS).some((items) => items.includes(term));
    const inTemperatureGroups = Object.values(TEMPERATURE_GROUPS).some((items) =>
      items.includes(term)
    );
    const inRankingHints = Object.values(RANKING_HINTS).some((items) => items.includes(term));

    return !inTagGroups && !inTemperatureGroups && !inRankingHints;
  });

  return {
    rawQuery: query,
    quantity,
    maxPrice: budgetMatch ? parseMoneyValue(budgetMatch[1], budgetMatch[2] || "") : null,
    minPortion: minimumPortion,
    desiredTags,
    temperature,
    ranking,
    searchTerms,
    searchPhrase: searchTerms.length > 1 ? searchTerms.join(" ") : searchTerms[0] || "",
  };
}

export function buildRequestSummary(parsedRequest) {
  const pieces = [];

  if (parsedRequest.quantity) {
    pieces.push(`${parsedRequest.quantity} item${parsedRequest.quantity > 1 ? "s" : ""}`);
  }

  if (parsedRequest.temperature) {
    pieces.push(parsedRequest.temperature);
  }

  if (parsedRequest.desiredTags.length) {
    pieces.push(parsedRequest.desiredTags.join(", "));
  }

  if (parsedRequest.maxPrice) {
    pieces.push("budget set");
  }

  if (parsedRequest.minPortion) {
    pieces.push(`minimum ${parsedRequest.minPortion.value}${parsedRequest.minPortion.unit}`);
  }

  return pieces.length ? pieces.join(" • ") : "general search";
}

export function buildMarketplaceOffers(products, sellers, parsedRequest, sellerLimit = 3) {
  const marketplaceSellers = pickMarketplaceSellers(sellers, sellerLimit);

  const offers = marketplaceSellers.map((seller) => {
    const sellerProducts = products.filter((product) => product.sellerId === seller.id);

    if (!sellerProducts.length) {
      return {
        id: `offer-preview-${seller.id}`,
        seller,
        product: {
          id: `missing-product-${seller.id}`,
          name: "No product available yet",
          category: "unavailable",
          price: 0,
          sizeLabel: "-",
          temperature: "",
          prepMinutes: 0,
        },
        quantity: Number(parsedRequest.quantity || 1),
        unitPrice: 0,
        totalPrice: 0,
        score: 0,
        reasons: ["seller has no products yet"],
        matchType: "unavailable",
        badges: [],
      };
    }

    let sellerMatches = sellerProducts
      .map((product) => scoreProduct(product, seller, parsedRequest, true))
      .filter(Boolean);

    let matchType = "match";

    if (!sellerMatches.length && parsedRequest.maxPrice) {
      sellerMatches = sellerProducts
        .map((product) => scoreProduct(product, seller, parsedRequest, false))
        .filter(Boolean);
      if (sellerMatches.length) {
        matchType = "near-budget";
      }
    }

    let topChoice = sortRecommendations(sellerMatches, parsedRequest.ranking)[0];

    if (!topChoice) {
      const fallbackProduct = chooseFallbackProduct(sellerProducts, parsedRequest.ranking);
      topChoice = {
        product: fallbackProduct,
        seller,
        score: 0,
        reasons: ["closest seller option"],
        totalPrice: Number(fallbackProduct.price) * Number(parsedRequest.quantity || 1),
      };
      matchType = "fallback";
    }

    return {
      id: `offer-preview-${seller.id}`,
      seller,
      product: topChoice.product,
      quantity: Number(parsedRequest.quantity || 1),
      unitPrice: Number(topChoice.product.price),
      totalPrice: Number(topChoice.totalPrice),
      score: Number(topChoice.score || 0),
      reasons: topChoice.reasons || [],
      matchType,
      badges: [],
    };
  });

  const decoratedOffers = applyOfferBadges(offers);
  const rankedOffers = sortRecommendations(
    decoratedOffers.map((offer) => ({
      ...offer,
      product: offer.product,
      totalPrice: offer.totalPrice,
      score: offer.score,
    })),
    parsedRequest.ranking
  );

  return {
    parsedRequest,
    offers: decoratedOffers,
    rankedOffers,
    marketplaceSellers,
  };
}
