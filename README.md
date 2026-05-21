# FOBOH Pricing Interview

A full-stack TypeScript pricing profile application for FOBOH's bespoke wholesale pricing challenge.

The app lets a supplier define pricing rules for customers, customer groups, and product sets, preview how those rules change prices, and resolve the final price for a specific customer-product pair.

## What It Accomplishes

This project answers the core pricing question:

> Given a customer, a product, and all pricing profiles, what price should the customer pay and why?

It supports:

- A seeded wine catalogue with products, customers, customer groups, and overlapping pricing profiles.
- Pricing profile CRUD for creating, editing, listing, and deleting rules.
- Product filtering and selection in the profile builder.
- Price preview before saving a profile.
- A price lookup tool that shows the winning profile, final price, and plain-English explanation.
- Backend tests for pricing math, resolver precedence, and the Bondi Cellars scenario.

## Codebase Structure

```text
.
├── backend/
│   ├── src/
│   │   ├── app.ts              # Express app wiring, routes, docs, errors
│   │   ├── index.ts            # Backend entry point
│   │   ├── types.ts            # Product, customer, profile, and adjustment types
│   │   ├── seed.ts             # Seed products/customers/groups/profiles
│   │   ├── store.ts            # In-memory data store
│   │   ├── pricing.ts          # Price adjustment math
│   │   ├── resolver.ts         # Winning pricing profile strategy
│   │   ├── validation.ts       # Zod request schemas
│   │   ├── openapi.ts          # OpenAPI spec
│   │   └── routes/             # Catalog, profile, and pricing routes
│   └── tests/                  # Vitest backend tests
└── frontend/
    ├── src/
    │   ├── App.tsx             # Top-level view switching
    │   ├── api/client.ts       # Typed fetch API client
    │   ├── types.ts            # Frontend domain types
    │   ├── pages/              # Profile list and profile builder
    │   ├── components/         # Tables, filters, forms, lookup, preview
    │   └── styles.css          # App styling
    └── vite.config.ts          # Vite config and dev API proxy
```

## Backend

The backend is an Express + TypeScript API. It deliberately uses an in-memory store instead of a database, which keeps the focus on pricing logic.

Important backend components:

- `backend/src/types.ts` defines the domain model.
- `backend/src/seed.ts` creates the initial challenge scenario.
- `backend/src/store.ts` exposes simple in-memory repositories.
- `backend/src/pricing.ts` applies fixed, percentage, and custom price adjustments.
- `backend/src/resolver.ts` chooses the winning profile.
- `backend/src/routes/profiles.ts` handles pricing profile CRUD.
- `backend/src/routes/pricing.ts` handles preview and final price resolution.

Backend endpoints include:

- `GET /api/products`
- `GET /api/customers`
- `GET /api/customer-groups`
- `GET /api/profiles`
- `POST /api/profiles`
- `PUT /api/profiles/:id`
- `DELETE /api/profiles/:id`
- `POST /api/pricing/preview`
- `GET /api/pricing/resolve?customerId=...&productId=...`
- `GET /docs`
- `GET /openapi.json`

## Frontend

The frontend is a React + TypeScript + Vite single-page app.

It has two main views:

- `ProfilesIndex`: shows existing pricing profiles and includes the price lookup tool.
- `ProfileBuilder`: creates or edits a pricing profile, selects products, previews pricing, and saves rules.

All backend communication goes through `frontend/src/api/client.ts`. The frontend does not duplicate pricing math; preview and final price resolution are calculated by the backend.

## Winning Strategy

The most important logic is in `backend/src/resolver.ts`.

When resolving a price, the backend:

1. Finds every pricing profile that matches the customer.
2. Finds every pricing profile that also matches the product.
3. Calculates the price each matching profile would produce.
4. Sorts the matching profiles by specificity.
5. Applies the strongest profile.
6. Returns the final price plus an explanation.

Profiles are ranked using this precedence order:

1. **Customer specificity**
   - Specific customer wins over customer group.
   - Customer group wins over all customers.

2. **Product specificity**
   - Explicit product IDs win over filters.
   - Narrow filters, such as brand or segment, win over broad filters.
   - Broad filters win over all products.

3. **Adjustment specificity**
   - Custom price wins over fixed or percentage adjustments when earlier scores tie.

4. **Priority**
   - Higher priority wins when specificity is tied.

5. **Updated time**
   - Most recently updated profile wins as the final tie-breaker.

This means the resolver prefers the most targeted business rule. For example, in the seeded Bondi Cellars scenario, the custom `$95` price for Bondi Cellars on Koyama Brut wins over broader group discounts because it targets the exact customer and exact product.

## Trade-offs

This implementation intentionally keeps the architecture small and easy to inspect for an interview challenge. That makes the pricing logic clear, but it also comes with trade-offs.

- **In-memory storage is simple but not persistent.** Profiles are stored in `Map`s and reset when the backend restarts. This is good for a focused coding challenge, but production would need a database, migrations, backups, and concurrency-safe writes.

- **The resolver favors clarity over configurability.** The winning strategy is hard-coded as a specificity tuple, which makes it predictable and easy to test. The trade-off is that changing precedence rules would require code changes rather than admin configuration.

- **Specificity can override priority.** Priority only matters after customer, product, and adjustment specificity are tied. This prevents broad high-priority rules from accidentally beating targeted rules, but it means users cannot use priority to override every other rule.

- **Frontend and backend types are duplicated.** The frontend mirrors the backend domain types manually. This keeps the repo lightweight, but a larger system would likely share generated types from OpenAPI or a shared package to avoid drift.

- **The frontend keeps state local.** React state lives in pages and components instead of a global store. This is simpler for two main views, but a bigger app might need React Router, query caching, optimistic updates, or centralized state.

- **Product filter profiles and UI-created profiles differ.** Seeded profiles can use dynamic `FILTER` rules, while the UI saves selected products as explicit `PRODUCT_IDS`. This makes the builder straightforward, but editing a seeded filter profile converts it into a fixed product snapshot.

- **Pricing math uses JavaScript numbers.** This is acceptable for the small sample data and keeps the implementation readable. For production-grade money handling, integer cents or a decimal library would be safer.

- **Authentication and authorization are out of scope.** The API is open locally and assumes a trusted user. A real supplier portal would need login, roles, audit history, and protection around profile changes.

## What I Would Do Next

If this were moving beyond an interview implementation, I would focus on making the system persistent, safer, and easier to operate.

- **Add a real database.** Move products, customers, groups, and pricing profiles into Postgres or MongoDB, with migrations or schema validation and proper indexes for customer/product lookup.

- **Use integer cents for money.** Store prices as cents instead of floating-point dollars to avoid rounding edge cases as the catalogue and pricing rules grow.

- **Share API types automatically.** Generate frontend types from the OpenAPI spec, or move shared contracts into a package, so backend and frontend shapes cannot drift.

- **Improve profile conflict visibility.** Show users which existing profiles overlap while they are creating a new rule, including which one would currently win and why.

- **Support dynamic filter editing in the UI.** Let users create and edit `FILTER` based profiles directly, instead of always saving selected products as `PRODUCT_IDS`.

- **Add authentication and audit logs.** Track who created, updated, or deleted profiles, and protect pricing changes behind user roles.

- **Expand test coverage around the API.** Add request-level tests for validation failures, profile CRUD, preview responses, and resolver endpoint behavior.

- **Add deployment configuration.** Provide production-ready environment variables, build scripts, health checks, and a simple deployment target for the frontend and backend.

- **Improve frontend data handling.** Add route-based navigation, loading states per action, query caching, and better empty/error states as the UI grows.

- **Make precedence configurable if needed.** Keep the current deterministic strategy as the default, but consider admin-configurable precedence only if real business rules require it.

## Running Locally

Install dependencies for both apps:

```sh
cd backend
npm install

cd ../frontend
npm install
```

Start the backend:

```sh
cd backend
npm run dev
```

The backend runs on `http://localhost:3001` by default.

Start the frontend in another terminal:

```sh
cd frontend
npm run dev
```

The frontend runs on `http://localhost:5173`.

During development, Vite proxies `/api` requests to the backend, so the frontend can call `/api/...` directly.

## Testing

Run backend tests:

```sh
cd backend
npm test
```

Run the frontend production build:

```sh
cd frontend
npm run build
```

The backend tests cover:

- Price adjustment math.
- Customer and product matching.
- Specificity ranking.
- The full Bondi Cellars overlapping-profile scenario.

## Useful Scripts

Backend:

```sh
npm run dev         # Start backend in watch mode
npm start           # Start backend once
npm test            # Run backend tests
npm run test:watch  # Run backend tests in watch mode
```

Frontend:

```sh
npm run dev      # Start Vite dev server
npm run build    # Type-check and build production assets
npm run preview  # Preview production build
```
