/**
 * Create or edit a pricing profile.
 *
 * Flow:
 *   1. Fill in name, customer scope, priority (top bar)
 *   2. Filter + select products from the table (left column)
 *   3. Set the adjustment type/direction/value (right column)
 *   4. Click "Preview Prices" to see computed new prices
 *   5. Click "Save Profile" to persist via the API
 *
 * All price math runs on the backend via POST /api/pricing/preview.
 * The UI never implements its own rounding or adjustment formulas.
 *
 * Note: the UI always saves profiles with a PRODUCT_IDS scope (the explicit
 * snapshot of selected rows). The seeded profiles use FILTER scope, which is
 * a dynamic rule — editing one of those converts it to PRODUCT_IDS on save.
 */

import { useEffect, useState } from 'react';
import { AdjustmentForm } from '../components/AdjustmentForm';
import { PricePreviewTable } from '../components/PricePreviewTable';
import { ProductFilters } from '../components/ProductFilters';
import { ProductTable } from '../components/ProductTable';
import {
  createProfile,
  getCustomers,
  getGroups,
  getProducts,
  previewPrices,
  updateProfile,
} from '../api/client';
import type {
  Adjustment,
  Customer,
  CustomerGroup,
  CustomerScope,
  PreviewItem,
  PricingProfile,
  ProfilePayload,
} from '../types';

interface FilterValues {
  q: string; subCategory: string; segment: string; brand: string;
}

interface Props {
  profile:  PricingProfile | null; // null = create mode
  onSaved:  () => void;
  onCancel: () => void;
}

// Encode/decode CustomerScope as a single select string.
function scopeToValue(scope: CustomerScope): string {
  if (scope.type === 'ALL_CUSTOMERS') return 'ALL_CUSTOMERS';
  if (scope.type === 'GROUP')         return `GROUP:${scope.groupId}`;
  return `CUSTOMER:${scope.customerId}`;
}
function valueToScope(value: string): CustomerScope {
  if (value === 'ALL_CUSTOMERS') return { type: 'ALL_CUSTOMERS' };
  if (value.startsWith('GROUP:'))    return { type: 'GROUP',    groupId:    value.slice(6) };
  return                                    { type: 'CUSTOMER', customerId: value.slice(9) };
}

export function ProfileBuilder({ profile, onSaved, onCancel }: Props) {
  // ── Profile metadata ─────────────────────────────────────────────────────
  const [name,          setName]          = useState(profile?.name     ?? '');
  const [priority,      setPriority]      = useState(profile?.priority ?? 0);
  const [customerScope, setCustomerScope] = useState<CustomerScope>(
    profile?.customerScope ?? { type: 'ALL_CUSTOMERS' },
  );

  // ── Catalog dropdowns ─────────────────────────────────────────────────────
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [groups,    setGroups]    = useState<CustomerGroup[]>([]);

  // ── Product selection ─────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterValues>(
    { q: '', subCategory: '', segment: '', brand: '' },
  );
  const [products,     setProducts]     = useState<import('../types').Product[]>([]);
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(
    () => new Set(
      profile?.productScope.type === 'PRODUCT_IDS'
        ? profile.productScope.productIds
        : [],
    ),
  );

  // ── Adjustment ────────────────────────────────────────────────────────────
  const [adjustment, setAdjustment] = useState<Adjustment>(
    profile?.adjustment ?? { kind: 'FIXED', direction: 'DECREASE', amount: 0 },
  );

  // ── Preview ───────────────────────────────────────────────────────────────
  const [previewItems, setPreviewItems] = useState<PreviewItem[] | null>(null);
  const [previewing,   setPreviewing]   = useState(false);

  // ── Status ────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  // Load customers and groups once.
  useEffect(() => {
    Promise.all([getCustomers(), getGroups()])
      .then(([c, g]) => { setCustomers(c); setGroups(g); })
      .catch(console.error);
  }, []);

  // Reload products whenever any filter changes.
  useEffect(() => {
    getProducts(filters)
      .then(setProducts)
      .catch(console.error);
  }, [filters.q, filters.subCategory, filters.segment, filters.brand]);

  function updateFilter(key: keyof FilterValues, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPreviewItems(null); // product list changed; old preview is stale
  }

  function toggleProduct(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setPreviewItems(null);
  }

  function toggleAll(ids: string[], checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) checked ? next.add(id) : next.delete(id);
      return next;
    });
    setPreviewItems(null);
  }

  async function handlePreview() {
    if (selectedIds.size === 0) {
      setError('Select at least one product to preview.');
      return;
    }
    setError(null);
    setPreviewing(true);
    try {
      const result = await previewPrices([...selectedIds], adjustment);
      setPreviewItems(result.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed.');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSave() {
    if (!name.trim())        { setError('Profile name is required.'); return; }
    if (selectedIds.size === 0) { setError('Select at least one product.'); return; }
    setError(null);
    setSaving(true);

    const payload: ProfilePayload = {
      name: name.trim(),
      customerScope,
      productScope: { type: 'PRODUCT_IDS', productIds: [...selectedIds] },
      adjustment,
      priority,
    };

    try {
      if (profile) {
        await updateProfile(profile.id, payload);
      } else {
        await createProfile(payload);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* ── Profile metadata ── */}
      <div className="card">
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label>Profile Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 10% off Wine for Independent Retailers"
            />
          </div>

          <div className="form-group" style={{ flex: 2 }}>
            <label>Applies To</label>
            <select
              value={scopeToValue(customerScope)}
              onChange={(e) => setCustomerScope(valueToScope(e.target.value))}
            >
              <option value="ALL_CUSTOMERS">All Customers</option>
              {groups.length > 0 && (
                <optgroup label="Customer Groups">
                  {groups.map((g) => (
                    <option key={g.id} value={`GROUP:${g.id}`}>{g.name}</option>
                  ))}
                </optgroup>
              )}
              {customers.length > 0 && (
                <optgroup label="Individual Customers">
                  {customers.map((c) => (
                    <option key={c.id} value={`CUSTOMER:${c.id}`}>{c.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="form-group form-group--narrow">
            <label>Priority</label>
            <input
              type="number"
              min={-100}
              max={100}
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
            />
          </div>
        </div>
      </div>

      {/* ── Two-column: products | adjustment ── */}
      <div className="builder-columns">

        {/* Left: product filter + table */}
        <div className="card">
          <h2>Products</h2>
          <ProductFilters values={filters} onChange={updateFilter} />
          <p className="selection-count">
            {selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''} selected
          </p>
          <ProductTable
            products={products}
            selectedIds={selectedIds}
            onToggle={toggleProduct}
            onSelectAll={toggleAll}
          />
        </div>

        {/* Right: adjustment + preview action */}
        <div>
          <div className="card">
            <h2>Adjustment</h2>
            <AdjustmentForm
              adjustment={adjustment}
              onChange={(adj) => { setAdjustment(adj); setPreviewItems(null); }}
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '.5rem' }}
            onClick={handlePreview}
            disabled={previewing || selectedIds.size === 0}
          >
            {previewing ? 'Previewing…' : 'Preview Prices'}
          </button>

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : profile ? 'Update Profile' : 'Save Profile'}
          </button>

          <button
            className="btn"
            style={{ width: '100%', marginTop: '.4rem' }}
            onClick={onCancel}
          >
            Cancel
          </button>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>

      {/* ── Preview results (full width, shown after preview) ── */}
      {previewItems !== null && (
        <div className="card">
          <h2>Price Preview</h2>
          <PricePreviewTable items={previewItems} />
        </div>
      )}
    </div>
  );
}
