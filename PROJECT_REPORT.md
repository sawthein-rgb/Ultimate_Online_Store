# Project Report

## Ultimate Online Store

**Project type:** Functional prototype web marketplace  
**Frontend:** HTML, CSS, Vanilla JavaScript  
**Backend / Database:** Firebase Firestore  
**Local prototype storage:** `localStorage` for chat and notifications

### Student Information

- **Name:** `Your Name`
- **Student ID:** `Your Student ID`
- **Course / Subject:** `Web Application Development`
- **Lecturer:** `Teacher Name`
- **Submission Date:** `27 April 2026`

## 1. Abstract

This project is a buyer-first online marketplace prototype called **Ultimate Online Store**. The system is designed to reduce buyer effort by allowing the buyer to communicate in natural language instead of searching manually through many products. In this prototype, one buyer sends a request such as "something sweet, hot, max 20k" and three sellers compete by replying with their own offers. The buyer can compare the offers, negotiate through chat, choose one seller, confirm the order, simulate payment, track order delivery progress, and view order history.

The application is built with **Vanilla JavaScript, HTML, and CSS** to keep the code simple and beginner-friendly. **Firebase Firestore** is used to store marketplace data such as products, sellers, requests, offers, orders, payments, and history. For fast prototype interaction, **localStorage** is used for live chat and notifications. The final result is a functional marketplace prototype with real interactions, not only static placeholders.

## 2. Background

Many marketplace systems still require buyers to spend time searching, filtering, and comparing items manually. This can be difficult when a buyer only has a general idea, such as wanting "something light and fresh" or "cheap nasi padang." In practice, buyers often prefer a simpler experience where they can describe what they want naturally and let sellers respond with the best offers.

This project was created to demonstrate a marketplace where the **buyer is the king**. Instead of forcing the buyer to do the heavy work, the system organizes seller competition and helps the buyer compare offers more easily. The prototype also shows how chat, payment, delivery tracking, notifications, and maps can be combined into one marketplace experience.

## 3. Problem Statement

The main problems addressed in this project are:

1. Buyers spend too much effort searching for products manually.
2. Comparing seller offers is often slow and unclear.
3. Many marketplace demos only show static pages without real interaction.
4. Buyers and sellers need better communication before order confirmation.
5. Teachers and evaluators need a working prototype that clearly shows end-to-end marketplace flow.

## 4. Project Objectives

The objectives of this project are:

1. To build a simple web-based marketplace prototype with a conversational interface.
2. To allow one buyer request to be answered by three different sellers.
3. To help the buyer compare offers by price, suitability, and convenience.
4. To support chat and negotiation before order confirmation.
5. To simulate payment and delivery tracking after order confirmation.
6. To store important marketplace records using Firestore.
7. To keep the code readable, modular, and beginner-friendly.

## 5. Scope of the Project

This project focuses on a **working demo prototype**. The implemented scope includes:

- Buyer request in natural language
- Three seller offer generation
- Offer comparison and selection
- Buyer-seller chat and price negotiation
- Order confirmation
- Payment simulation
- Seller-controlled order status updates
- Buyer notifications
- Map preview and distance estimation
- Order history
- Admin page for manual product entry and seeding sample data

The project does **not** include:

- Real login and authentication
- Real payment gateway integration
- Real courier tracking API
- Full production security model
- AI/LLM integration beyond rule-based keyword parsing

## 6. Tools and Technologies

The main tools used in this project are:

- **HTML** for page structure
- **CSS** for layout and styling
- **Vanilla JavaScript** for application logic and UI interaction
- **Firebase Firestore** for online data storage
- **localStorage** for lightweight real-time prototype chat and notifications
- **Leaflet + OpenStreetMap** for map display
- **Nominatim / estimated address fallback** for simple location lookup

The decision to use Vanilla JavaScript was made to keep the project easy to understand and easy to demonstrate without heavy frameworks.

## 7. System Overview

The application uses a marketplace page with **4 main tabs / roles**:

1. **Buyer**
2. **Seller 1**
3. **Seller 2**
4. **Seller 3**

The buyer sends one request, and all three sellers respond based on their own product lists. The buyer can then compare, negotiate, and continue to checkout.

### Main Pages

- **Home page (`index.html`)**
  - Main marketplace flow
  - Buyer chat-first interface
  - Seller response panels
- **Order history page (`history.html`)**
  - Shows saved requests, offers, orders, and payment updates
- **Seller page (`sellers.html`)**
  - Shows seller information
- **Admin page (`admin.html`)**
  - Allows sample data seeding and manual product/seller entry

## 8. System Architecture

This project uses a simple frontend-service-storage architecture.

### Frontend Layer

The frontend is responsible for:

- rendering the buyer and seller tabs
- reading form input
- showing chat messages and offers
- updating UI in response to order, payment, and notification events

### Service Layer

The JavaScript service files organize the main logic:

- `store-service.js`
  - Firestore connection
  - local demo fallback
  - request, offer, order, payment, and history storage
- `recommendation-service.js`
  - request parsing
  - product scoring
  - ranking and offer generation
- `chat-service.js`
  - local chat threads
  - message synchronization across tabs
- `notification-service.js`
  - notification storage and unread counts
- `map-service.js`
  - map rendering
  - route link generation
  - distance calculation

### Data Layer

- **Firestore** stores persistent marketplace data
- **localStorage** stores lightweight live interaction data for the prototype

## 9. Database Design

The system uses these Firestore collections:

### `buyers`

Stores buyer information such as:

- id
- name
- phone number
- address
- preferences

### `sellers`

Stores seller profile information such as:

- id
- name
- phone number
- address
- rating
- short video
- marketplace slot
- map location

### `products`

Stores product catalog information such as:

- id
- name
- price
- category
- seller id
- seller contact
- description
- size / weight / volume
- media URL
- tags
- temperature
- preparation time

### `requests`

Stores buyer request data:

- request id
- query text
- quantity
- budget
- address
- ranking preference
- parsed request details

### `offers`

Stores seller replies to a request:

- offer id
- request id
- seller data
- product data
- quantity
- unit price
- total price
- reasons
- badges
- ranking score

### `orders`

Stores the final chosen order:

- order id
- request id
- offer id
- buyer data
- seller data
- product data
- quantity
- total price
- payment status
- fulfillment status

### `payments`

Stores simulated payment information:

- payment id
- order id
- amount
- payment method
- payment status

### `history`

Stores event-based records such as:

- request created
- offers generated
- order confirmed
- payment updated
- order tracking updated

## 10. Main Features

### 10.1 Conversational Buyer Request

The buyer can type requests in natural language, for example:

- "something sweet"
- "light, fresh, and energizing"
- "cheap and simple"
- "nasi padang"
- "hot"
- "max 21k"

The system parses the request using keyword rules and extracts:

- desired tags
- product temperature
- quantity
- maximum budget
- ranking preference
- minimum portion if provided

### 10.2 Three-Seller Competition

After the buyer sends a request, the system generates one offer from each of the three sellers based on the seller's own product list. This creates a competitive marketplace where the buyer can compare options immediately.

### 10.3 Ranking and Recommendation

Offers can be ranked by:

- **best match**
- **cheapest**
- **simple / fastest**

The recommendation logic combines product tags, temperature, budget, product name match, seller rating, and preparation time.

### 10.4 Full Chat-Based Marketplace Interface

The marketplace page uses a chat-first experience:

- the buyer sends a request as a chat message
- the system summarizes the request
- each seller reply appears in the conversation
- the buyer can continue chat with sellers before ordering

This makes the marketplace easier to understand and more natural for users.

### 10.5 Negotiation and Revised Offers

The buyer can ask a seller for a better price. For example:

- "Can you lower the price?"
- "Can you make it 18k?"
- "Can I get 2 for cheaper?"

The seller can then send a **revised offer**. If the buyer accepts the revised offer, that new price becomes the active offer used for checkout and order confirmation.

### 10.6 Order Confirmation

After the buyer chooses an offer, the system creates an order record and stores:

- buyer information
- seller information
- selected product
- quantity
- unit price
- total price
- payment status
- fulfillment status

### 10.7 Payment Simulation

The system includes a basic payment prototype. Available statuses are:

- `pending`
- `paid`
- `failed`

After clicking the payment action, the payment record and order status are updated and saved.

### 10.8 Seller-Controlled Order Tracking

Order tracking is controlled by the seller, not the buyer. The seller can update:

- `cooking`
- `on the way`
- `arrived`

The buyer can only view the current status. When an order is completed, the buyer can immediately place a new order again, while the completed order remains saved in history.

### 10.9 Notifications

The notification system informs users when important actions happen.

Buyer notifications:

- seller sends a message
- seller updates order status

Seller notifications:

- buyer sends a message
- buyer creates a new request

Unread notification counts are shown as indicators in the interface.

### 10.10 Maps and Distance

The system uses buyer and seller address data to display:

- a map preview
- estimated distance between buyer and seller
- a route link to Google Maps

If live geocoding or map tiles are not available, the app falls back to lightweight route behavior so the demo still works.

### 10.11 Order History

The history page stores previous events and allows the teacher or user to see that the system has persistent order records.

### 10.12 Admin and Sample Data

The admin page helps with:

- seeding starter data
- manually creating sellers
- manually creating products

This makes the app easier to test and demonstrate.

## 11. Main Workflow

The main workflow of the system is:

1. Buyer enters a natural-language request.
2. System parses the request.
3. All 3 sellers generate their own offer.
4. Buyer compares the offers in the chat interface.
5. Buyer may negotiate with one seller.
6. Seller may send a revised offer.
7. Buyer accepts an offer or revised offer.
8. Buyer confirms the order.
9. System creates order and payment records.
10. Seller updates order status from cooking to on the way to arrived.
11. Buyer receives notifications and sees status updates.
12. Completed order remains in history, and the buyer can start a new request.

## 12. User Interface Design

The UI was designed to be:

- clean
- easy to read
- beginner-friendly
- suitable for a live screen-share demo

The design prioritizes the buyer view, because the main idea of the project is that the buyer should have less work and more clarity.

### Buyer Interface

The buyer sees:

- request input
- quantity, budget, and address fields
- chat thread
- seller offer replies
- negotiation area
- chosen offer area
- payment panel
- map panel
- notification area
- live order tracking status

### Seller Interface

Each seller sees:

- buyer request summary
- own recommended offer
- seller chat interface
- revised offer controls
- order tracking controls
- buyer messages and notifications

## 13. Implementation Highlights

Some important implementation choices in this project are:

1. **Modular JavaScript services**
   - logic is separated into service files instead of writing everything in one large script
2. **Firestore + localStorage hybrid**
   - Firestore stores the marketplace data
   - localStorage keeps chat and notifications simple for demo use
3. **Local demo fallback**
   - if Firebase config is not added, the app still runs using local demo mode
4. **Rule-based request parsing**
   - easier to understand than adding a heavy AI model in version 1
5. **Seller-controlled fulfillment**
   - better matches real business flow

## 14. Testing and Demo Scenarios

The application can be tested using scenarios such as:

### Scenario 1: Sweet and Hot Request

- Buyer enters: `something sweet, 2 hot, 3`
- System finds suitable hot and sweet products
- Three sellers reply with different totals
- Buyer compares and chooses one

### Scenario 2: Budget Request

- Buyer enters: `light, fresh, energizing, max 21k`
- System filters products near or within the budget
- Buyer chooses the best matched offer

### Scenario 3: Specific Food Request

- Buyer enters: `nasi padang, cheap and simple`
- Sellers respond with their nasi padang products
- Ranking favors cheaper or faster options

### Scenario 4: Negotiation

- Buyer asks one seller for a better price
- Seller sends a revised offer
- Buyer accepts revised offer and confirms the order

### Scenario 5: Delivery Tracking

- Seller updates status to `cooking`
- Seller updates status to `on the way`
- Seller updates status to `arrived`
- Buyer sees the updates in real time

## 15. Advantages of the System

The main strengths of the project are:

- buyer-first concept
- natural-language request input
- competitive seller response model
- readable beginner-friendly code
- real interactions instead of only placeholders
- working prototype that is easy to demonstrate
- clear separation between marketplace logic and UI logic

## 16. Limitations

Although the prototype is functional, it still has some limitations:

1. Chat and notifications use localStorage, so they are best for demo use.
2. Payment is simulated and not connected to a real payment gateway.
3. Authentication is not implemented yet.
4. Security rules are minimal because the focus is a prototype.
5. The recommendation engine is keyword-based, not AI-based.
6. Delivery route display is simplified and not connected to a real courier API.

These limitations are acceptable for version 1 because the project goal is a working prototype.

## 17. Future Improvements

The next development ideas for this project are:

1. Add real user authentication for buyer and seller accounts.
2. Move live chat from localStorage to Firestore or WebSocket-based real-time messaging.
3. Add a real payment gateway integration.
4. Improve map support with more accurate geolocation and route APIs.
5. Add seller dashboard analytics.
6. Add AI-assisted product tagging and smarter request understanding.
7. Add delivery partner integration and estimated arrival time.

## 18. Conclusion

This project successfully delivers a **functional marketplace prototype** that focuses on buyer convenience and seller competition. The buyer can describe needs in natural language, receive three different seller offers, negotiate if needed, confirm an order, simulate payment, track delivery progress, and review order history. Sellers can respond, negotiate, and control fulfillment status directly from their tabs.

The system achieves its main goal of moving from a simple marketplace demo into a more realistic interactive prototype. Even though some advanced features are still simplified, the application already demonstrates a complete and clear marketplace flow suitable for academic presentation and future development.

## 19. How to Run the Project

To run the project locally:

1. Open Terminal in the project folder.
2. Run:

```bash
python3 -m http.server 8080
```

3. Open the browser at:

```text
http://localhost:8080
```

### Local Demo Mode

If Firebase config is still empty, the system runs in local demo mode automatically.

### Firestore Mode

If you want live Firestore mode:

1. Create a Firebase project
2. Enable Firestore
3. Copy the Firebase web config into `assets/js/config/firebase-config.js`
4. Reload the app
5. Open `admin.html` and seed sample data

## 20. References

1. Firebase Documentation. *Cloud Firestore*. Available at: [https://firebase.google.com/docs/firestore](https://firebase.google.com/docs/firestore)
2. Firebase Documentation. *Add Firebase to your JavaScript project*. Available at: [https://firebase.google.com/docs/web/setup](https://firebase.google.com/docs/web/setup)
3. Leaflet Documentation. Available at: [https://leafletjs.com/](https://leafletjs.com/)
4. OpenStreetMap. Available at: [https://www.openstreetmap.org/](https://www.openstreetmap.org/)
5. MDN Web Docs. *Window.localStorage*. Available at: [https://developer.mozilla.org/docs/Web/API/Window/localStorage](https://developer.mozilla.org/docs/Web/API/Window/localStorage)

## 21. Short Presentation Summary

If needed for class presentation, this short summary can be used:

> This project is a buyer-first marketplace prototype. The buyer sends one request in natural language, and three sellers compete by giving their own offers. The buyer can compare, negotiate in chat, confirm an order, simulate payment, track delivery status, and view order history. The system is built with Vanilla JavaScript and Firebase Firestore, with localStorage used for lightweight live chat and notifications.
