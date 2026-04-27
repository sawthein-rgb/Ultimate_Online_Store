import {
  getCollectionCounts,
  getStoreStatus,
  initStore,
  listProducts,
  listSellers,
  saveProduct,
  saveSeller,
  seedSampleData,
} from "../services/store-service.js";
import { escapeHtml, formatCurrency, formatSizeLabel } from "../utils/formatters.js";

const elements = {
  modeBadge: document.querySelector("#admin-mode-badge"),
  collectionSummary: document.querySelector("#collection-summary"),
  seedDataButton: document.querySelector("#seed-data-button"),
  seedStatus: document.querySelector("#seed-status"),
  sellerForm: document.querySelector("#seller-form"),
  sellerFormStatus: document.querySelector("#seller-form-status"),
  productForm: document.querySelector("#product-form"),
  productFormStatus: document.querySelector("#product-form-status"),
  sellerSelect: document.querySelector("#product-seller-select"),
  productList: document.querySelector("#admin-product-list"),
  aiTagPlaceholder: document.querySelector("#ai-tag-placeholder"),
};

document.addEventListener("DOMContentLoaded", initializePage);

async function initializePage() {
  await initStore();
  renderModeBadge();
  attachEventListeners();
  await refreshPage();
}

function renderModeBadge() {
  elements.modeBadge.textContent =
    getStoreStatus().mode === "firestore" ? "Firestore live mode" : "Local demo mode";
}

function attachEventListeners() {
  elements.seedDataButton.addEventListener("click", handleSeedData);
  elements.sellerForm.addEventListener("submit", handleSellerSubmit);
  elements.productForm.addEventListener("submit", handleProductSubmit);
  elements.aiTagPlaceholder.addEventListener("click", () => {
    elements.productFormStatus.textContent =
      "Future AI hook: send the product description and media URL to a lightweight model, then suggest tags before saving.";
  });
}

async function refreshPage() {
  const [counts, sellers, products] = await Promise.all([
    getCollectionCounts(),
    listSellers(),
    listProducts(),
  ]);

  renderCollectionSummary(counts);
  renderSellerOptions(sellers);
  renderProductList(products, sellers);
}

function renderCollectionSummary(counts) {
  elements.collectionSummary.innerHTML = Object.entries(counts)
    .map(([collectionName, count]) => {
      return `
        <article class="stat-card">
          <span>${escapeHtml(collectionName)}</span>
          <strong>${escapeHtml(String(count))}</strong>
        </article>
      `;
    })
    .join("");
}

function renderSellerOptions(sellers) {
  if (!sellers.length) {
    elements.sellerSelect.innerHTML = '<option value="">Add a seller first</option>';
    return;
  }

  elements.sellerSelect.innerHTML = sellers
    .map((seller) => {
      return `<option value="${escapeHtml(seller.id)}">${escapeHtml(seller.name)}</option>`;
    })
    .join("");
}

function renderProductList(products, sellers) {
  if (!products.length) {
    elements.productList.innerHTML =
      '<div class="empty-state">No products yet. Seed sample data or add one manually.</div>';
    return;
  }

  const sellerMap = new Map(sellers.map((seller) => [seller.id, seller]));

  elements.productList.innerHTML = products
    .map((product) => {
      const seller = sellerMap.get(product.sellerId);

      return `
        <article class="data-row">
          <div class="history-top">
            <div>
              <p class="eyebrow">${escapeHtml(product.category)}</p>
              <h3>${escapeHtml(product.name)}</h3>
              <p class="meta-line">${escapeHtml(product.description || "No description yet.")}</p>
            </div>
            <span class="soft-badge">${formatCurrency(product.price)}</span>
          </div>
          <div class="pill-row">
            <span class="meta-chip">Seller: ${escapeHtml(seller?.name || product.sellerId)}</span>
            <span class="meta-chip">${escapeHtml(formatSizeLabel(product))}</span>
            <span class="meta-chip">${escapeHtml(`${product.prepMinutes || 10} min prep`)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

async function handleSeedData() {
  elements.seedDataButton.disabled = true;
  elements.seedStatus.textContent = "Seeding sample sellers and products...";

  try {
    const result = await seedSampleData();
    elements.seedStatus.textContent = `Seed complete: ${result.sellers} sellers and ${result.products} products ready.`;
    await refreshPage();
  } catch (error) {
    console.error(error);
    elements.seedStatus.textContent = "Seed failed. Check your Firebase setup and try again.";
  } finally {
    elements.seedDataButton.disabled = false;
  }
}

async function handleSellerSubmit(event) {
  event.preventDefault();
  elements.sellerFormStatus.textContent = "Saving seller...";

  try {
    const values = Object.fromEntries(new FormData(elements.sellerForm).entries());
    await saveSeller(values);
    elements.sellerForm.reset();
    elements.sellerFormStatus.textContent = "Seller saved.";
    await refreshPage();
  } catch (error) {
    console.error(error);
    elements.sellerFormStatus.textContent = "Seller could not be saved.";
  }
}

async function handleProductSubmit(event) {
  event.preventDefault();
  elements.productFormStatus.textContent = "Saving product...";

  try {
    const values = Object.fromEntries(new FormData(elements.productForm).entries());
    await saveProduct(values);
    elements.productForm.reset();
    elements.productFormStatus.textContent =
      "Product saved. Future AI classification can hook into this form before submit.";
    await refreshPage();
  } catch (error) {
    console.error(error);
    elements.productFormStatus.textContent = "Product could not be saved.";
  }
}
