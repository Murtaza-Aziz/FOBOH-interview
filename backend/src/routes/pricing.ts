/**
 * Pricing endpoints.
 *
 * POST /api/pricing/preview   — compute new prices for a list of products
 * GET  /api/pricing/resolve   — run the precedence resolver for a customer+product
 *
 * Both endpoints delegate all price math to the pure functions in pricing.ts
 * and resolver.ts. Routes only do I/O: parse, fetch from store, call, respond.
 */

import { Router } from 'express';
import { applyAdjustment } from '../pricing.js';
import { resolvePrice } from '../resolver.js';
import { customersRepo, productsRepo, profilesRepo } from '../store.js';
import {
  PreviewRequestSchema,
  ResolveQuerySchema,
  validate,
} from '../validation.js';

export const pricingRouter = Router();

pricingRouter.post('/preview', (req, res, next) => {
  try {
    const { productIds, adjustment } = validate(PreviewRequestSchema, req.body);

    const items = productIds
      .filter((id) => productsRepo.get(id) !== undefined) // skip unknown IDs
      .map((id) => {
        const product = productsRepo.get(id)!;
        return {
          productId: product.id,
          title: product.title,
          sku: product.sku,
          basePrice: product.basePrice,
          newPrice: applyAdjustment(product.basePrice, adjustment),
        };
      });

    res.json({ items });
  } catch (err) {
    next(err);
  }
});

pricingRouter.get('/resolve', (req, res, next) => {
  try {
    const { customerId, productId } = validate(ResolveQuerySchema, req.query);

    const customer = customersRepo.get(customerId);
    if (!customer) {
      res.status(404).json({ error: `Customer '${customerId}' not found` });
      return;
    }

    const product = productsRepo.get(productId);
    if (!product) {
      res.status(404).json({ error: `Product '${productId}' not found` });
      return;
    }

    const result = resolvePrice(customer, product, profilesRepo.list());

    // Flatten matchedProfiles so the response doesn't nest the full profile
    // object inside each entry — keeps the JSON readable and avoids duplication.
    res.json({
      customerId: result.customerId,
      productId: result.productId,
      basePrice: result.basePrice,
      finalPrice: result.finalPrice,
      winningProfile: result.winningProfile
        ? { id: result.winningProfile.id, name: result.winningProfile.name }
        : null,
      matchedProfiles: result.matchedProfiles.map((m) => ({
        profileId: m.profile.id,
        profileName: m.profile.name,
        candidatePrice: m.candidatePrice,
        specificity: m.specificity,
      })),
      explanation: result.explanation,
    });
  } catch (err) {
    next(err);
  }
});
