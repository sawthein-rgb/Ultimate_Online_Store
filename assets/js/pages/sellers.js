import { getStoreStatus, initStore, listProducts, listSellers } from "../services/store-service.js";
import {
  escapeHtml,
  formatCurrency,
  formatSizeLabel,
} from "../utils/formatters.js";

const elements = {
  modeBadge: document.querySelector("#seller-mode-badge"),
  sellerList: document.querySelector("#seller-list"),
};

document.addEventListener("DOMContentLoaded", initializePage);

async function initializePage() {
  await initStore();
  elements.modeBadge.textContent =
    getStoreStatus().mode === "firestore" ? "Firestore live mode" : "Local demo mode";

  const [sellers, products] = await Promise.all([listSellers(), listProducts()]);
  renderSellers(sellers, products);
}

function renderSellers(sellers, products) {
  if (!sellers.length) {
    elements.sellerList.innerHTML =
      '<div class="empty-state">No sellers yet. Use the Admin page to add one.</div>';
    return;
  }

  const productsBySeller = new Map();
  sellers.forEach((seller) => productsBySeller.set(seller.id, []));
  products.forEach((product) => {
    const groupedProducts = productsBySeller.get(product.sellerId) || [];
    groupedProducts.push(product);
    productsBySeller.set(product.sellerId, groupedProducts);
  });

  elements.sellerList.innerHTML = sellers
    .map((seller) => {
      const sellerProducts = (productsBySeller.get(seller.id) || []).sort(
        (left, right) => Number(left.price) - Number(right.price)
      );

      return `
        <article class="seller-card">
          <div class="seller-top">
            <div>
              <p class="eyebrow">Seller profile</p>
              <h3>${escapeHtml(seller.name)}</h3>
              <p class="meta-line">${escapeHtml(seller.tagline || "Marketplace seller")}</p>
            </div>
            <span class="price-badge">${escapeHtml(`${seller.rating}/5`)}</span>
          </div>

          <div class="seller-meta">
            <div class="summary-row">
              <span>Contact</span>
              <strong>${escapeHtml(seller.phoneNumber)}</strong>
            </div>
            <div class="summary-row">
              <span>Address</span>
              <strong>${escapeHtml(seller.address)}</strong>
            </div>
            <div class="summary-row">
              <span>Short media</span>
              <strong>${escapeHtml(seller.shortVideo || "No media link yet")}</strong>
            </div>
          </div>

          <div class="pill-row">
            <span class="meta-chip">IM placeholder ready</span>
            <span class="meta-chip">Map placeholder ready</span>
            <span class="meta-chip">${escapeHtml(`${sellerProducts.length} products`)}</span>
          </div>

          <div class="stack-list">
            ${sellerProducts.length
              ? sellerProducts
                  .map((product) => {
                    return `
                      <article class="data-row">
                        <div class="history-top">
                          <div>
                            <h3>${escapeHtml(product.name)}</h3>
                            <p class="meta-line">${escapeHtml(product.description || "No description yet.")}</p>
                          </div>
                          <span class="soft-badge">${formatCurrency(product.price)}</span>
                        </div>
                        <div class="pill-row">
                          <span class="meta-chip">${escapeHtml(product.category)}</span>
                          <span class="meta-chip">${escapeHtml(formatSizeLabel(product))}</span>
                          <span class="meta-chip">${escapeHtml(`${product.prepMinutes || 10} min prep`)}</span>
                        </div>
                      </article>
                    `;
                  })
                  .join("")
              : '<div class="empty-state">This seller does not have products yet.</div>'}
          </div>
        </article>
      `;
    })
    .join("");
}
