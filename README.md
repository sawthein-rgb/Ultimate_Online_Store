# Ultimate Online Store

A beginner-friendly marketplace demo built with vanilla HTML, CSS, and JavaScript. The homepage now uses **4 role tabs**:

- `Buyer`
- `Seller 1`
- `Seller 2`
- `Seller 3`

The buyer types one request in natural language, all three sellers generate their own offer from their own product list, and the buyer compares the replies before confirming one final order.

## Project structure

```text
WAD25/
├── admin.html
├── history.html
├── index.html
├── sellers.html
├── firestore.rules
├── README.md
└── assets
    ├── css
    │   └── styles.css
    └── js
        ├── config
        │   └── firebase-config.js
        ├── data
        │   └── sample-data.js
        ├── pages
        │   ├── admin.js
        │   ├── history.js
        │   ├── home.js
        │   └── sellers.js
        ├── services
        │   ├── recommendation-service.js
        │   └── store-service.js
        └── utils
            └── formatters.js
```

## Features

- 4-tab homepage for one buyer and three competing sellers
- Natural-language product matching for queries like `something sweet`, `cheap and simple`, `nasi padang`, `hot`, and `max 21k`
- Buyer controls for quantity, budget, address, and ranking mode
- One seller reply per seller tab with product, price, quantity, total, and contact
- Side-by-side buyer comparison view for all 3 replies
- Firestore collections for `buyers`, `sellers`, `products`, `requests`, `offers`, `orders`, and `history`
- Order history page for requests, offers, and confirmed orders
- Admin page for seeding sample data and manual entry
- Local demo fallback so the app still works before Firebase keys are added

## Firestore setup

1. Create a Firebase project and enable Firestore.
2. Open `assets/js/config/firebase-config.js`.
3. Replace the placeholder values with your Firebase web app config.
4. Serve the project with any static server.

Example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Demo flow

1. Open the Buyer tab on `index.html`.
2. Type a request such as `something sweet, 2 hot, 3`.
3. Set quantity, budget, and address.
4. Submit the request.
5. Seller 1, Seller 2, and Seller 3 each generate one reply.
6. Compare the offers side by side.
7. Choose the best offer and confirm it.

If Firebase config is still empty, the app runs in local demo mode and auto-loads starter sellers and products. If Firebase config is present, the app uses Firestore live mode. In Firestore mode, open `admin.html` and click **Seed sample data** once to create starter records.

## Collections used

- `buyers`: buyer details saved when an order is confirmed
- `sellers`: seller contact, rating, and profile media
- `products`: seller-owned catalog items
- `requests`: buyer requests submitted from the Buyer tab
- `offers`: one reply per seller for each request
- `orders`: the final chosen order
- `history`: simple event trail for request, offer, and order activity

## Notes for version 2

- AI-assisted tag generation can be added in `admin.js`
- Smarter intent parsing can expand from `recommendation-service.js`
- Chat handoff can be added inside each seller tab
- Maps, payment, and delivery tracking can be connected after order confirmation
