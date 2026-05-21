/**
 * Express app wiring.
 *
 * Deliberate choices documented here so they're easy to explain:
 *
 * CORS        — locked to FRONTEND_ORIGIN (default: Vite dev server on 5173).
 *               In production this would be the deployed frontend URL.
 *
 * Error handler — catches anything passed to next(err), strips stack traces,
 *                 and returns a plain { error: message } JSON body. Express
 *                 recognises the 4-argument signature as an error handler.
 *                 Errors with a `.status` property (set by validate()) become
 *                 that HTTP status; everything else becomes 500.
 *
 * Swagger UI  — served from the unpkg CDN so no npm package is required.
 *               The spec itself is served at /openapi.json from this server.
 */

import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { openApiSpec } from './openapi.js';
import { catalogRouter } from './routes/catalog.js';
import { pricingRouter } from './routes/pricing.js';
import { profilesRouter } from './routes/profiles.js';

export const app = express();

const FRONTEND_ORIGIN = process.env['FRONTEND_ORIGIN'] ?? 'http://localhost:5173';

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────

app.use('/api', catalogRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/pricing', pricingRouter);

// ── OpenAPI spec + Swagger UI ────────────────────────────────────────────────

app.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

/**
 * CDN-based Swagger UI — no npm package, no CJS/ESM juggling.
 * The UI fetches /openapi.json from this same server.
 */
app.get('/docs', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <title>FOBOH Pricing API – Docs</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
      });
    </script>
  </body>
</html>`);
});

// ── 404 catch-all ────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Central error handler ────────────────────────────────────────────────────
// Must have exactly 4 parameters for Express to treat this as an error handler.
// Stack traces are logged server-side only; clients never see them.

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = (err as { status?: number }).status ?? 500;
  const message =
    err instanceof Error ? err.message : 'Internal server error';
  if (status >= 500) {
    console.error('[error]', err);
  }
  res.status(status).json({ error: message });
};

app.use(errorHandler);
