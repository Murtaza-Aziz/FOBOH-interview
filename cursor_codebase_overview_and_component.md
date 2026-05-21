# Codebase overview and component explanation
_Exported on 5/21/2026 at 22:31:01 GMT+10 from Cursor (3.5.17)_

---

**User**

explain to me what the entire codebase is doing in plain english for the backend and its most important componenets and the same for the frontend i wish to grasp a full understanding of what it is trying to do 

---

**Cursor**

I’ll map the backend and frontend separately, then tie them together in plain English so you can see the full app flow rather than just isolated files. I’m going to inspect the project structure and key entry points first.

I’ve got the high-level map now. I’m going to read the main backend and frontend files directly so the explanation can point to the real code paths and avoid hand-wavy guesses.

This codebase is a small full-stack pricing app for FOBOH. In plain English: it lets a supplier create special pricing rules for customers or customer groups, preview what those rules would do to product prices, and look up the final price a specific customer should pay for a specific product.

## Big Picture

The app is about **bespoke pricing profiles**.

Example:

- Bondi Cellars belongs to the `Independent Retailers` and `VIP` groups.
- Wine products have standard base prices.
- Pricing rules can say things like:
  - “Independent Retailers get 10% off all Wine”
  - “VIP customers get $15 off Sparkling Wine”
  - “Bondi Cellars gets Koyama Brut for exactly $95”
- If multiple rules match, the backend decides which one wins.

The frontend is the admin UI. The backend owns the pricing logic.

## Backend

The backend lives in `backend/src`.

It is an **Express + TypeScript API**. There is no real database; data is stored in memory using `Map`s and seeded when the server starts.

The main files are:

- `backend/src/index.ts`: starts the server.
- `backend/src/app.ts`: wires up Express, CORS, routes, Swagger docs, 404s, and error handling.
- `backend/src/types.ts`: defines the core business objects.
- `backend/src/seed.ts`: creates sample products, customers, groups, and pricing profiles.
- `backend/src/store.ts`: holds the in-memory data.
- `backend/src/pricing.ts`: does the raw price math.
- `backend/src/resolver.ts`: decides which pricing profile wins.
- `backend/src/routes/*`: exposes API endpoints.

The backend has three main API areas:

- Catalog routes: `GET /api/products`, `GET /api/customers`, `GET /api/customer-groups`
- Profile routes: create, list, update, delete pricing profiles at `/api/profiles`
- Pricing routes: preview and resolve prices at `/api/pricing`

The most important backend concept is a `PricingProfile`. It says:

- who the rule applies to: all customers, one customer, or a customer group
- what products it applies to: all products, selected product IDs, or a product filter
- what adjustment to apply: fixed amount, percentage, or custom price
- priority and timestamps for tie-breaking

The core decision-making is in `backend/src/resolver.ts`. It finds all pricing profiles that match a customer and product, then sorts them by specificity:

1. A specific customer beats a group, and a group beats all customers.
2. Specific product IDs beat product filters, and filters beat all products.
3. Custom price beats fixed or percentage adjustments.
4. Higher priority wins if the above are tied.
5. Most recently updated wins as the final tie-breaker.

So for Bondi Cellars buying Koyama Brut, the custom `$95` rule wins because it targets both the exact customer and exact product.

The actual math is simpler and lives in `backend/src/pricing.ts`:

- fixed discount/increase: subtract or add dollars
- percentage discount/increase: subtract or add a percentage of base price
- custom price: replace the base price entirely
- final price is clamped so it never goes below zero
- result is rounded to cents

## Frontend

The frontend lives in `frontend/src`.

It is a **React + TypeScript + Vite** single-page app. There is no React Router, Redux, TanStack Query, or UI framework. It uses plain React state, effects, native `fetch`, and global CSS.

The main files are:

- `frontend/src/main.tsx`: mounts React.
- `frontend/src/App.tsx`: switches between the list page and builder page.
- `frontend/src/api/client.ts`: all backend API calls go through here.
- `frontend/src/types.ts`: frontend copies of the backend domain types.
- `frontend/src/pages/ProfilesIndex.tsx`: shows existing pricing profiles.
- `frontend/src/pages/ProfileBuilder.tsx`: create/edit profile screen.
- `frontend/src/components/PriceLookup.tsx`: test which price applies for a customer/product pair.
- `frontend/src/components/*`: product table, filters, adjustment form, preview table.

The frontend has two main screens.

First is the **Pricing Profiles list**, from `ProfilesIndex.tsx`. It loads profiles, customers, and groups, then shows a table of pricing rules. From here you can create, edit, or delete profiles. It also includes the price lookup tool at the bottom.

Second is the **Profile Builder**, from `ProfileBuilder.tsx`. This is where the user creates or edits a rule. The flow is:

1. Name the profile.
2. Choose who it applies to: all customers, a group, or one customer.
3. Filter and select products.
4. Choose the adjustment type: fixed, percentage, or custom price.
5. Preview prices.
6. Save the profile.

Important detail: the frontend does **not** calculate pricing itself. When you click preview, it calls the backend endpoint `POST /api/pricing/preview`. That keeps the pricing rules centralized in the backend.

The frontend talks to the backend through `frontend/src/api/client.ts`. For example:

- `getProducts()` calls `/api/products`
- `getProfiles()` calls `/api/profiles`
- `createProfile()` posts to `/api/profiles`
- `previewPrices()` posts to `/api/pricing/preview`
- `resolvePrice()` calls `/api/pricing/resolve`

During development, `frontend/vite.config.ts` proxies `/api` requests to `http://localhost:3001`, while Vite itself runs on port `5173`.

## End-To-End Flow

A typical user journey looks like this:

1. User opens the frontend.
2. Frontend loads existing pricing profiles from the backend.
3. User creates a new profile.
4. Frontend lets them choose customer scope, products, and adjustment.
5. User previews prices.
6. Backend calculates the adjusted prices and returns them.
7. User saves the profile.
8. Backend stores it in memory.
9. Later, the user uses Price Lookup.
10. Backend checks all matching profiles and returns the final price plus an explanation.

So the frontend is mostly a clean admin interface, while the backend is where the business logic lives.

## The Core Purpose

This project is trying to demonstrate a pricing engine for wholesale products. Its most important job is answering:

> “Given this customer and this product, what price should they pay, and why?”

Everything else supports that goal: profiles define rules, the catalog provides products/customers, the builder creates rules, preview shows effects, and the resolver explains the final decision.

---

**User**

give me a deeper dive into @backend/src/resolver.ts and waht it is trying to do be very thorough and succient when explaing it

---

**Cursor**

`backend/src/resolver.ts` is the backend’s **pricing decision engine**.

Its job is to answer:

> For this customer and this product, which pricing profile applies, what final price should be charged, and why?

It does **not** handle HTTP, databases, validation, or saving data. It is pure business logic.

## The Core Flow

The main function is `resolvePrice()`.

```141:169:backend/src/resolver.ts
export function resolvePrice(
  customer: Customer,
  product: Product,
  profiles: PricingProfile[],
): ResolutionResult {
  const matched: MatchedProfile[] = profiles
    .filter(
      (p) =>
        customerMatches(p.customerScope, customer) &&
        productMatches(p.productScope, product),
    )
    .map((profile) => ({
      profile,
      specificity: specificityTuple(profile),
      candidatePrice: applyAdjustment(product.basePrice, profile.adjustment),
    }))
    .sort((a, b) => compareTuplesDesc(a.specificity, b.specificity));

  const winner = matched[0] ?? null;

  return {
    customerId: customer.id,
    productId: product.id,
    basePrice: product.basePrice,
    finalPrice: winner ? winner.candidatePrice : product.basePrice,
    winningProfile: winner ? winner.profile : null,
    matchedProfiles: matched,
    explanation: explain(customer, product, matched),
  };
}
```

In plain English, it does this:

1. Look through every pricing profile.
2. Keep only the profiles that match both the customer and the product.
3. For each matching profile, calculate:
   - how specific it is
   - what price it would produce
4. Sort the matching profiles from strongest to weakest.
5. Pick the first one as the winner.
6. Return the final price, winner, all matched profiles, and a readable explanation.

## Matching The Customer

`customerMatches()` checks whether a profile applies to the customer.

```31:42:backend/src/resolver.ts
export function customerMatches(
  scope: CustomerScope,
  customer: Customer,
): boolean {
  switch (scope.type) {
    case 'ALL_CUSTOMERS':
      return true;
    case 'CUSTOMER':
      return scope.customerId === customer.id;
    case 'GROUP':
      return customer.groupIds.includes(scope.groupId);
  }
}
```

There are three possible customer scopes:

- `ALL_CUSTOMERS`: applies to everyone.
- `CUSTOMER`: applies only to one specific customer.
- `GROUP`: applies if the customer belongs to that group.

So if Bondi Cellars belongs to `VIP`, a `GROUP: VIP` profile matches Bondi.

## Matching The Product

`productMatches()` checks whether a profile applies to the product.

```45:61:backend/src/resolver.ts
export function productMatches(
  scope: ProductScope,
  product: Product,
): boolean {
  switch (scope.type) {
    case 'ALL_PRODUCTS':
      return true;
    case 'PRODUCT_IDS':
      return scope.productIds.includes(product.id);
    case 'FILTER': {
      const f = scope.filter;
      if (f.brand && f.brand !== product.brand) return false;
      if (f.subCategory && f.subCategory !== product.subCategory) return false;
      if (f.segment && f.segment !== product.segment) return false;
      return true;
    }
  }
}
```

There are three possible product scopes:

- `ALL_PRODUCTS`: applies to every product.
- `PRODUCT_IDS`: applies only to selected product IDs.
- `FILTER`: applies to products matching fields like brand, category, or segment.

Example:

```ts
{ type: 'FILTER', filter: { subCategory: 'Wine', segment: 'Sparkling' } }
```

That means: apply to all sparkling wines.

## Specificity

Matching tells us **which profiles are candidates**.

Specificity tells us **which candidate should win**.

This is the key idea in the file.

```5:15:backend/src/resolver.ts
 * Precedence rule (high to low):
 *   1. customer specificity  CUSTOMER=2, GROUP=1, ALL_CUSTOMERS=0
 *   2. product  specificity  PRODUCT_IDS=3,
 *                            FILTER with segment or brand=2,
 *                            FILTER with subCategory only=1,
 *                            ALL_PRODUCTS or empty FILTER=0
 *   3. adjustment specificity CUSTOM_PRICE=1, FIXED/PERCENTAGE=0
 *   4. explicit priority (higher wins)
 *   5. most recently updated (updatedAt epoch, higher wins)
```

The resolver assumes: **more specific rules beat broader rules**.

A rule for one exact customer is stronger than a rule for a customer group. A rule for one exact product is stronger than a rule for all wine.

## Customer Specificity

```66:75:backend/src/resolver.ts
export function customerSpecificity(scope: CustomerScope): number {
  switch (scope.type) {
    case 'CUSTOMER':
      return 2;
    case 'GROUP':
      return 1;
    case 'ALL_CUSTOMERS':
      return 0;
  }
}
```

Higher number means stronger rule.

So:

- specific customer = `2`
- customer group = `1`
- all customers = `0`

## Product Specificity

```77:91:backend/src/resolver.ts
export function productSpecificity(scope: ProductScope): number {
  switch (scope.type) {
    case 'PRODUCT_IDS':
      return 3;
    case 'FILTER': {
      const f = scope.filter;
      // segment and brand are narrow in the F&B catalogue; sub-category is broad.
      if (f.segment || f.brand) return 2;
      if (f.subCategory) return 1;
      return 0;
    }
    case 'ALL_PRODUCTS':
      return 0;
  }
}
```

Again, higher means stronger.

So:

- exact selected products = `3`
- filter by segment or brand = `2`
- filter by broad category like Wine = `1`
- all products = `0`

This means “Koyama Brut only” beats “all Sparkling Wine”, which beats “all Wine”.

## Adjustment Specificity

```93:95:backend/src/resolver.ts
export function adjustmentSpecificity(adj: Adjustment): number {
  return adj.kind === 'CUSTOM_PRICE' ? 1 : 0;
}
```

A `CUSTOM_PRICE` is considered more specific than a discount or increase.

So this:

```ts
{ kind: 'CUSTOM_PRICE', price: 95 }
```

beats this if everything else ties:

```ts
{ kind: 'PERCENTAGE', direction: 'DECREASE', percent: 10 }
```

## The Specificity Tuple

The resolver combines all the scores into one array.

```97:107:backend/src/resolver.ts
/** [customer, product, adjustment, priority, updatedAtEpoch] — higher wins. */
export type SpecificityTuple = [number, number, number, number, number];

export function specificityTuple(profile: PricingProfile): SpecificityTuple {
  return [
    customerSpecificity(profile.customerScope),
    productSpecificity(profile.productScope),
    adjustmentSpecificity(profile.adjustment),
    profile.priority,
    Date.parse(profile.updatedAt) || 0,
  ];
}
```

Example tuple:

```ts
[2, 3, 1, 0, 1777593600000]
```

Means:

- `2`: exact customer
- `3`: exact product
- `1`: custom price
- `0`: priority
- timestamp: last updated time

The tuple is compared from left to right. Earlier values matter more than later values.

So customer specificity is more important than product specificity, product specificity is more important than adjustment type, and so on.

## Sorting Winners

```110:121:backend/src/resolver.ts
export function compareTuplesDesc(
  a: SpecificityTuple,
  b: SpecificityTuple,
): number {
  for (let i = 0; i < a.length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) return bv - av;
  }
  return 0;
}
```

This sorts profiles from strongest to weakest.

If two profiles differ at the first position, customer specificity decides. If tied, it checks product specificity. If tied again, it checks adjustment specificity, then priority, then timestamp.

This is called lexicographic comparison: compare item 1, then item 2, then item 3, etc.

## Price Calculation

The resolver itself does not know the math details. It delegates that to `applyAdjustment()` from `backend/src/pricing.ts`.

```152:156:backend/src/resolver.ts
.map((profile) => ({
  profile,
  specificity: specificityTuple(profile),
  candidatePrice: applyAdjustment(product.basePrice, profile.adjustment),
}))
```

Each matching profile gets a `candidatePrice`, meaning:

> If this profile won, this is the price it would charge.

Only the winner’s candidate price becomes the final price.

## Explanation Text

The last part of the file turns the resolver result into human-readable language.

```208:235:backend/src/resolver.ts
function explain(
  customer: Customer,
  product: Product,
  matched: MatchedProfile[],
): string {
  if (matched.length === 0) {
    return `No pricing rule applies to ${customer.name} for "${product.title}". ` +
           `They pay the standard price of $${product.basePrice.toFixed(2)}.`;
  }

  const winner = matched[0]!;
  const why = whyWins(winner.profile);

  if (matched.length === 1) {
    return `"${winner.profile.name}" applies — ${why}.`;
  }

  const overridden = matched
    .slice(1)
    .map((m) => `"${m.profile.name}" ($${m.candidatePrice.toFixed(2)})`)
    .join(', ');

  const count = matched.length - 1;
  return (
    `"${winner.profile.name}" wins at $${winner.candidatePrice.toFixed(2)} — ${why}. ` +
    `${count} other rule${count > 1 ? 's' : ''} also matched but ${count > 1 ? 'were' : 'was'} overridden: ${overridden}.`
  );
}
```

This is what powers the frontend’s “why did this price win?” display.

If no rules match, it says the customer pays standard price.

If one rule matches, it says that rule applies.

If multiple rules match, it says which rule won and which other rules were overridden.

## Concrete Example

For Bondi Cellars buying Koyama Brut:

Three seeded profiles can match:

1. `10% off Wine for Independent Retailers`
2. `$15 off Sparkling Wine for VIP`
3. `Bondi Cellars custom price on Koyama Brut NV`

The third one wins because it targets:

- the exact customer: Bondi Cellars
- the exact product: Koyama Brut
- a custom price: `$95`

So the resolver returns:

- base price: `$120`
- final price: `$95`
- winning profile: Bondi custom price profile
- matched profiles: all three rules, sorted winner first
- explanation: a sentence explaining why the custom rule won

## The Mental Model

Think of `resolver.ts` as a referee.

It does not create rules.  
It does not store rules.  
It does not expose API routes.  
It simply receives:

```ts
customer + product + all pricing profiles
```

Then it answers:

```ts
which profiles match?
which one is strongest?
what final price should be charged?
how do we explain that decision?
```

That is the heart of the backend.

---

**User**

help me create granular commits for the codebase for git dont commit them just yet 

---

**Cursor**

I’ll help break the current working tree into sensible, reviewable commit groups without creating any commits. First I’ll inspect the git state, diffs, and recent commit style so the grouping matches what’s actually changed.

It looks like `/Users/murtaza/FOBOH interview` itself is not currently a git repository, so I can’t yet read status/diff from that root. I’ll check whether `backend` or `frontend` are separate repos, or whether there’s no `.git` initialized yet.

There’s no `.git` folder anywhere under the project, so there is no commit history or working-tree diff to slice yet. I’ll still outline a clean granular commit sequence based on the current codebase structure, including what to stage for each commit once git is initialized.

---

**User**

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**

I’ll execute this without creating commits: set up repo hygiene first, initialize git if needed, verify the intended file groups, and run the backend/frontend validation. I’ll update the existing todo statuses as I go.

There is still no git repository and no `.gitignore`, so I’m adding the ignore file first to protect dependency folders and local artifacts before any git staging happens.

Next I’m initializing git so the commit groups can be prepared against a real index. Because you asked not to commit yet, I’m going to verify the planned staging groups without creating commits.

`git init` hit a sandbox permission issue while creating hooks, so I’m retrying with the needed filesystem permission. I’ll first check whether a partial `.git` directory was created.

The repo is initialized now. I also see an extra `docs/` directory that wasn’t in the attached plan, so I’m leaving it unplanned/untracked unless you later want it folded into the commit sequence.

The backend groups all resolve to the intended files and exclude `node_modules`. I’m doing the same dry-run check for the frontend commit groups now.

Frontend staging groups also line up with the plan. I’m running the backend test suite and frontend build next so we know the planned commits are in a good state before any actual commits are made.

The first validation attempt didn’t run inside the package folders correctly because npm looked for a root `package.json`. I’m rerunning with explicit `--prefix` package paths so npm targets `backend` and `frontend` directly.

Validation passed. I noticed one backend test file, `backend/tests/pricing.test.ts`, exists in the codebase but was not listed in the attached plan; I’m including it in the backend test commit grouping so the pricing math tests don’t get left behind.

The frontend build produced `frontend/tsconfig.tsbuildinfo`, which is a local TypeScript build artifact and should not be committed. I’m tightening `.gitignore` to cover that before finishing.

Implemented the plan without creating any commits.

I initialized git for `/Users/murtaza/FOBOH interview`, added a root `.gitignore`, and verified the backend/frontend granular staging groups with `git add -n` dry-runs so nothing is actually staged yet.

Validation passed:

- Backend: `39` tests passed across `3` test files.
- Frontend: `npm run build` completed successfully.

A couple notes:

- I included `backend/tests/pricing.test.ts` in the backend test grouping because it exists but was not listed in the plan.
- `docs/FOBOH-Fullstack [Pricing] - 2026 update-110526-013115.pdf` is still untracked and not part of the plan.
- No commits were made, and no source files are staged right now.

---

**User**

https://github.com/Murtaza-Aziz/FOBOH-interview  commit it to this repo of mine in Granular commits 

---

**Cursor**

I’ll turn the prepared groups into real commits and push them to your GitHub repo without force-pushing. First I’m going to inspect the local git state, staged/unstaged changes, and remote/default branch so I can base the granular commits on the existing GitHub history safely.

The GitHub repo’s default branch is `main`, and the local repo currently has no commits. I’m going to attach `origin`, fetch `main`, base the local branch on the existing GitHub history, then create the granular commits on top.

Writing `.git/config` was blocked by sandbox permissions, so I’m retrying that git setup step outside the sandbox. This is only adding the remote and fetching your existing `main`, not committing yet.

I’m creating the commits now, one group at a time using explicit file lists. I’m also leaving the unplanned `docs` PDF out of these commits so the pushed history matches the attached granular plan.

The first commit attempt failed because Git has no author identity configured locally. I won’t change your git config; I’ll use one-off author/committer environment variables for these commits and continue.

The 10 local commits are created on top of `origin/main`; the only remaining untracked item is the unplanned `docs/` folder. I’m pushing the commit stack to GitHub now.

Done. I created and pushed 10 granular commits to `main` on [Murtaza-Aziz/FOBOH-interview](https://github.com/Murtaza-Aziz/FOBOH-interview).

Pushed commits:

- `chore: initialize project ignore rules`
- `chore: add backend TypeScript service scaffold`
- `feat: model seeded pricing catalog and in-memory store`
- `feat: implement pricing math and profile resolution`
- `feat: expose pricing profile API`
- `test: cover pricing math and Bondi resolver scenario`
- `chore: add frontend Vite React scaffold`
- `feat: add typed frontend API layer and domain types`
- `feat: build pricing profile management UI`
- `style: add application styling`

Validation already passed before committing:

- Backend tests: `39 passed`
- Frontend build: successful

Only `docs/` remains untracked locally because it was not part of the granular commit plan.

---

**User**

add to the readme file the deatils  about the codebase, how to run it and test it and what it accomplisehes and what is the winning startegy 

---

**Cursor**

I’ll update the README with a clear project overview, backend/frontend run instructions, testing commands, and the pricing “winning strategy” so someone landing on the repo can understand and run it quickly. First I’ll read the current README and package scripts to keep the instructions accurate.

The current README is just a title, so I’m replacing it with a practical guide: what the app does, the project layout, install/run/test commands, API notes, and the resolver precedence strategy.

The README content is in place. I’ll quickly check the edited file and run a lightweight status/lint check so we know exactly what changed.

Markdown lint only flagged the missing final newline, so I’m fixing that small formatting issue now.

Updated `README.md` with:

- Codebase overview and structure
- What the app accomplishes
- Backend and frontend responsibilities
- API summary
- Local install/run instructions
- Test/build commands
- The resolver “winning strategy” and precedence rules

I also fixed the markdown trailing newline lint issue. No tests were run since this was documentation-only. `docs/` is still untracked locally.

---

**User**

what are some of the trade offs with the approch include it in the readme file

---

**Cursor**

I’ll add a concise “Trade-offs” section to the README that explains the main engineering choices: in-memory storage, duplicated types, frontend simplicity, resolver precedence, and where this would need hardening for production.

I found the best spot for the new content: right after the winning strategy, before run instructions. I’m adding it there so the README explains both the decision and its consequences.

Added a `Trade-offs` section to `README.md`.

It now covers the main compromises: in-memory storage, hard-coded resolver precedence, priority behavior, duplicated types, local frontend state, `FILTER` vs `PRODUCT_IDS`, JavaScript number money math, and missing auth for production.

Markdown lint is clean.

---

**User**

and what are some of the things you would do include it in the readme

---

**Cursor**

I’ll add a concise “What I Would Do Next” section to the README, focused on practical production improvements and polish rather than changing the current implementation.

The trade-offs section is already a good lead-in, so I’m placing the “next steps” section right after it and before local setup instructions.

Added a `What I Would Do Next` section to `README.md`.

It covers next-step improvements like a real database, integer cents for money, generated/shared API types, conflict visibility, dynamic filter editing, auth/audit logs, broader API tests, deployment config, frontend data handling, and configurable precedence if needed.

Markdown lint is clean.

