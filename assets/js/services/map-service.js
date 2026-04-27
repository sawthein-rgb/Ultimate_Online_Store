const LEAFLET_CSS_ID = "uos-leaflet-css";
const LEAFLET_SCRIPT_ID = "uos-leaflet-script";
const DEFAULT_CENTER = {
  lat: -6.2,
  lng: 106.8166,
};
const ADDRESS_HINTS = [
  {
    keywords: ["melati", "merdeka", "central jakarta"],
    point: { lat: -6.1779, lng: 106.825 },
  },
  {
    keywords: ["sabang", "thamrin", "jakarta pusat"],
    point: { lat: -6.1862, lng: 106.8261 },
  },
  {
    keywords: ["senopati", "south jakarta", "jakarta selatan"],
    point: { lat: -6.2273, lng: 106.8093 },
  },
  {
    keywords: ["kemang", "ampang"],
    point: { lat: -6.2615, lng: 106.8133 },
  },
  {
    keywords: ["jakarta"],
    point: { lat: -6.2, lng: 106.8166 },
  },
  {
    keywords: ["PU Student Housing"],
    point: { lat: -6.282895, lng: 107.170774 },
  }
];

const locationCache = new Map();
const mapInstances = new WeakMap();

function hashText(value) {
  return [...String(value || "")].reduce((sum, character) => sum + character.charCodeAt(0), 0);
}

function estimateAddressPoint(address) {
  const loweredAddress = String(address || "").toLowerCase().trim();
  const matchedHint = ADDRESS_HINTS.find((item) => item.keywords.some((keyword) => loweredAddress.includes(keyword)));

  if (matchedHint) {
    return {
      ...matchedHint.point,
      source: "hint",
    };
  }

  const hash = hashText(loweredAddress || "jakarta");
  const latOffset = ((hash % 50) - 25) * 0.002;
  const lngOffset = ((Math.floor(hash / 7) % 50) - 25) * 0.002;

  return {
    lat: DEFAULT_CENTER.lat + latOffset,
    lng: DEFAULT_CENTER.lng + lngOffset,
    source: "estimated",
  };
}

async function geocodeAddress(address) {
  const query = String(address || "").trim();

  if (!query) {
    return null;
  }

  if (locationCache.has(query)) {
    return locationCache.get(query);
  }

  try {
    const searchParams = new URLSearchParams({
      format: "jsonv2",
      limit: "1",
      q: query,
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${searchParams.toString()}`);

    if (response.ok) {
      const results = await response.json();
      const firstMatch = Array.isArray(results) ? results[0] : null;

      if (firstMatch?.lat && firstMatch?.lon) {
        const point = {
          lat: Number(firstMatch.lat),
          lng: Number(firstMatch.lon),
          source: "geocoded",
        };

        locationCache.set(query, point);
        return point;
      }
    }
  } catch (error) {
    console.warn("Online geocoding failed. Falling back to local estimation.", error);
  }

  const fallbackPoint = estimateAddressPoint(query);
  locationCache.set(query, fallbackPoint);
  return fallbackPoint;
}

async function loadLeaflet() {
  if (window.L) {
    return window.L;
  }

  if (!document.getElementById(LEAFLET_CSS_ID)) {
    const link = document.createElement("link");
    link.id = LEAFLET_CSS_ID;
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }

  const existingScript = document.getElementById(LEAFLET_SCRIPT_ID);
  if (existingScript) {
    return new Promise((resolve, reject) => {
      if (window.L) {
        resolve(window.L);
        return;
      }

      existingScript.addEventListener("load", () => resolve(window.L), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = LEAFLET_SCRIPT_ID;
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function calculateDistanceKm(fromPoint, toPoint) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(toPoint.lat - fromPoint.lat);
  const deltaLng = toRadians(toPoint.lng - fromPoint.lng);
  const lat1 = toRadians(fromPoint.lat);
  const lat2 = toRadians(toPoint.lat);

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return earthRadiusKm * arc;
}

function buildRouteLink(buyerAddress, sellerAddress) {
  const searchParams = new URLSearchParams({
    api: "1",
    origin: buyerAddress,
    destination: sellerAddress,
    travelmode: "driving",
  });

  return `https://www.google.com/maps/dir/?${searchParams.toString()}`;
}

function renderFallbackMap(container, routeLink) {
  container.innerHTML = `
    <div class="map-fallback">
      <strong>Map preview is in lightweight mode.</strong>
      <p class="meta-line">
        Leaflet or map tiles could not load, but the route link is still ready for the demo.
      </p>
      <a class="button secondary" href="${routeLink}" target="_blank" rel="noreferrer">
        Open route in Google Maps
      </a>
    </div>
  `;
}

export async function renderRouteMap({
  container,
  buyerAddress,
  sellerAddress,
  sellerLocation = null,
  buyerLabel = "Buyer",
  sellerLabel = "Seller",
}) {
  if (!container || !buyerAddress || !sellerAddress) {
    return null;
  }

  const buyerPoint = await geocodeAddress(buyerAddress);
  const sellerPoint =
    sellerLocation?.lat && sellerLocation?.lng
      ? {
          lat: Number(sellerLocation.lat),
          lng: Number(sellerLocation.lng),
          source: "seller-profile",
        }
      : await geocodeAddress(sellerAddress);

  const distanceKm = calculateDistanceKm(buyerPoint, sellerPoint);
  const routeLink = buildRouteLink(buyerAddress, sellerAddress);

  try {
    const L = await loadLeaflet();
    const existingMap = mapInstances.get(container);

    if (existingMap) {
      existingMap.remove();
    }

    container.innerHTML = "";
    const map = L.map(container, {
      zoomControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const buyerMarker = L.marker([buyerPoint.lat, buyerPoint.lng]).addTo(map);
    buyerMarker.bindPopup(`${buyerLabel}<br />${buyerAddress}`);

    const sellerMarker = L.marker([sellerPoint.lat, sellerPoint.lng]).addTo(map);
    sellerMarker.bindPopup(`${sellerLabel}<br />${sellerAddress}`);

    const routeLine = L.polyline(
      [
        [buyerPoint.lat, buyerPoint.lng],
        [sellerPoint.lat, sellerPoint.lng],
      ],
      {
        color: "#be5b38",
        weight: 4,
        opacity: 0.8,
      }
    ).addTo(map);

    map.fitBounds(routeLine.getBounds(), {
      padding: [28, 28],
    });
    mapInstances.set(container, map);
  } catch (error) {
    console.warn("Map library could not load. Falling back to the route link.", error);
    renderFallbackMap(container, routeLink);
  }

  return {
    buyerPoint,
    sellerPoint,
    distanceKm,
    routeLink,
  };
}
