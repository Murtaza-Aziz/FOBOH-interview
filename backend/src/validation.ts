/**
 * Zod request schemas.
 *
 * Validation rules enforced here:
 *  - Profile name: non-empty string
 *  - FILTER product scope: at least one field set (brand/subCategory/segment)
 *  - PRODUCT_IDS: at least one ID in the array
 *  - Fixed amount:   >= 0
 *  - Percentage:     0 – 100
 *  - Custom price:   >= 0
 *  - Priority:       integer, -100 to 100
 *  - createdAt/updatedAt are never accepted from the client (not in schema)
 */

import { z } from 'zod';

export const AdjustmentSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('FIXED'),
    direction: z.enum(['INCREASE', 'DECREASE']),
    amount: z.number().nonnegative('Fixed amount must be >= 0'),
  }),
  z.object({
    kind: z.literal('PERCENTAGE'),
    direction: z.enum(['INCREASE', 'DECREASE']),
    percent: z.number().min(0, 'Percent must be >= 0').max(100, 'Percent must be <= 100'),
  }),
  z.object({
    kind: z.literal('CUSTOM_PRICE'),
    price: z.number().nonnegative('Custom price must be >= 0'),
  }),
]);

const CustomerScopeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ALL_CUSTOMERS') }),
  z.object({ type: z.literal('CUSTOMER'), customerId: z.string().min(1) }),
  z.object({ type: z.literal('GROUP'), groupId: z.string().min(1) }),
]);

/**
 * An empty FILTER is rejected — if the intent is "all products" the caller
 * must use ALL_PRODUCTS explicitly. This avoids accidentally wide-open profiles.
 */
const NonEmptyFilterSchema = z
  .object({
    brand: z.string().min(1).optional(),
    subCategory: z.string().min(1).optional(),
    segment: z.string().min(1).optional(),
  })
  .refine(
    (f) =>
      f.brand !== undefined ||
      f.subCategory !== undefined ||
      f.segment !== undefined,
    {
      message:
        'FILTER must specify at least one of: brand, subCategory, segment. ' +
        'Use ALL_PRODUCTS for an explicit wildcard.',
    },
  );

const ProductScopeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ALL_PRODUCTS') }),
  z.object({
    type: z.literal('PRODUCT_IDS'),
    productIds: z
      .array(z.string().min(1))
      .min(1, 'PRODUCT_IDS must contain at least one product ID'),
  }),
  z.object({
    type: z.literal('FILTER'),
    filter: NonEmptyFilterSchema,
  }),
]);

export const CreateProfileSchema = z.object({
  name: z.string().min(1, 'Profile name must not be empty'),
  customerScope: CustomerScopeSchema,
  productScope: ProductScopeSchema,
  adjustment: AdjustmentSchema,
  priority: z.number().int('Priority must be an integer').min(-100).max(100).optional(),
});

/** PUT is a full replacement — same shape as create. */
export const UpdateProfileSchema = CreateProfileSchema;

export const PreviewRequestSchema = z.object({
  productIds: z
    .array(z.string().min(1))
    .min(1, 'At least one productId is required'),
  adjustment: AdjustmentSchema,
});

export const ResolveQuerySchema = z.object({
  customerId: z.string().min(1, 'customerId is required'),
  productId: z.string().min(1, 'productId is required'),
});

/**
 * Parse and throw a 400 on failure. Used in route handlers so validation
 * errors go through the central error handler cleanly.
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues
      .map((i) => {
        const path = i.path.join('.');
        return path ? `${path}: ${i.message}` : i.message;
      })
      .join('; ');
    const err = new Error(message) as Error & { status: number };
    err.status = 400;
    throw err;
  }
  return result.data;
}
