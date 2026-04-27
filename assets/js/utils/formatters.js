export function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeTagList(tags) {
  if (Array.isArray(tags)) {
    return [...new Set(tags.map((item) => slugify(item)).filter(Boolean))];
  }

  return [
    ...new Set(
      String(tags || "")
        .split(",")
        .map((item) => slugify(item))
        .filter(Boolean)
    ),
  ];
}

export function formatTemperature(value) {
  if (!value) {
    return "-";
  }

  const labels = {
    hot: "Hot",
    cold: "Cold",
    room: "Room temperature",
  };

  return labels[value] || value;
}

export function formatSizeLabel(product = {}) {
  if (product.sizeLabel) {
    return product.sizeLabel;
  }

  if (product.volumeMl) {
    return `${product.volumeMl} ml`;
  }

  if (product.weightGram) {
    return `${product.weightGram} g`;
  }

  return "-";
}

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
