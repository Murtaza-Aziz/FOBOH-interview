/**
 * Read-only catalog routes. All data comes from the seeded in-memory store.
 *
 * Product filtering:
 *  - q           substring match on title OR sku (case-insensitive)
 *  - subCategory exact match (case-insensitive)
 *  - segment     exact match (case-insensitive)
 *  - brand       exact match (case-insensitive)
 */

import { Router } from 'express';
import { customersRepo, groupsRepo, productsRepo } from '../store.js';

export const catalogRouter = Router();

catalogRouter.get('/products', (req, res) => {
  const { q, subCategory, segment, brand } = req.query as Record<string, string | undefined>;

  let products = productsRepo.list();

  if (q) {
    const lower = q.toLowerCase();
    products = products.filter(
      (p) =>
        p.title.toLowerCase().includes(lower) ||
        p.sku.toLowerCase().includes(lower),
    );
  }
  if (subCategory) {
    const lower = subCategory.toLowerCase();
    products = products.filter((p) => p.subCategory.toLowerCase() === lower);
  }
  if (segment) {
    const lower = segment.toLowerCase();
    products = products.filter((p) => p.segment.toLowerCase() === lower);
  }
  if (brand) {
    const lower = brand.toLowerCase();
    products = products.filter((p) => p.brand.toLowerCase() === lower);
  }

  res.json(products);
});

catalogRouter.get('/customers', (_req, res) => {
  res.json(customersRepo.list());
});

catalogRouter.get('/customer-groups', (_req, res) => {
  res.json(groupsRepo.list());
});
