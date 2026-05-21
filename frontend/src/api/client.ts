/**
 * Typed API client. All network calls go through `apiFetch` so error handling
 * is in one place: non-2xx responses are thrown as Error with the server's
 * `error` message. Route handlers catch these and render them to the user.
 */

import type {
  Adjustment,
  Customer,
  CustomerGroup,
  PricingProfile,
  PreviewResponse,
  Product,
  ProfilePayload,
  ResolveResponse,
} from '../types';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, options);
  if (!res.ok) {
    // Try to parse the backend's { error: "..." } shape, fall back to status text.
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? res.statusText);
  }
  // 204 No Content has no body.
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Catalog (read-only) ──────────────────────────────────────────────────────

export function getProducts(params: {
  q?: string;
  subCategory?: string;
  segment?: string;
  brand?: string;
}): Promise<Product[]> {
  const qs = new URLSearchParams();
  if (params.q)           qs.set('q', params.q);
  if (params.subCategory) qs.set('subCategory', params.subCategory);
  if (params.segment)     qs.set('segment', params.segment);
  if (params.brand)       qs.set('brand', params.brand);
  return apiFetch<Product[]>(`/api/products?${qs}`);
}

export const getCustomers = (): Promise<Customer[]> =>
  apiFetch('/api/customers');

export const getGroups = (): Promise<CustomerGroup[]> =>
  apiFetch('/api/customer-groups');

// ── Profiles (CRUD) ──────────────────────────────────────────────────────────

export const getProfiles = (): Promise<PricingProfile[]> =>
  apiFetch('/api/profiles');

export const createProfile = (data: ProfilePayload): Promise<PricingProfile> =>
  apiFetch('/api/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateProfile = (id: string, data: ProfilePayload): Promise<PricingProfile> =>
  apiFetch(`/api/profiles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteProfile = (id: string): Promise<void> =>
  apiFetch(`/api/profiles/${id}`, { method: 'DELETE' });

// ── Pricing ──────────────────────────────────────────────────────────────────

export const previewPrices = (
  productIds: string[],
  adjustment: Adjustment,
): Promise<PreviewResponse> =>
  apiFetch('/api/pricing/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productIds, adjustment }),
  });

export const resolvePrice = (
  customerId: string,
  productId: string,
): Promise<ResolveResponse> =>
  apiFetch(`/api/pricing/resolve?customerId=${encodeURIComponent(customerId)}&productId=${encodeURIComponent(productId)}`);
