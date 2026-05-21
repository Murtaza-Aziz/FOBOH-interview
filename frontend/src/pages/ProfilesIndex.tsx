import { useEffect, useState } from 'react';
import { PriceLookup } from '../components/PriceLookup';
import { deleteProfile, getCustomers, getGroups, getProfiles } from '../api/client';
import type { Customer, CustomerGroup, CustomerScope, PricingProfile } from '../types';

interface Props {
  onNew:  () => void;
  onEdit: (profile: PricingProfile) => void;
}

function describeCustomerScope(
  scope: CustomerScope,
  customers: Customer[],
  groups: CustomerGroup[],
): string {
  if (scope.type === 'ALL_CUSTOMERS') return 'All customers';
  if (scope.type === 'GROUP') {
    const name = groups.find((g) => g.id === scope.groupId)?.name ?? scope.groupId;
    return `Group: ${name}`;
  }
  const name = customers.find((c) => c.id === scope.customerId)?.name ?? scope.customerId;
  return `Customer: ${name}`;
}

function describeAdjustment(profile: PricingProfile): string {
  const adj = profile.adjustment;
  if (adj.kind === 'CUSTOM_PRICE') return `Custom $${adj.price.toFixed(2)}`;
  const sign = adj.direction === 'DECREASE' ? '-' : '+';
  if (adj.kind === 'FIXED')      return `${sign}$${adj.amount.toFixed(2)}`;
  if (adj.kind === 'PERCENTAGE') return `${sign}${adj.percent}%`;
  return '';
}

function describeProductScope(profile: PricingProfile): string {
  const scope = profile.productScope;
  if (scope.type === 'ALL_PRODUCTS') return 'All products';
  if (scope.type === 'PRODUCT_IDS')  return `${scope.productIds.length} product${scope.productIds.length !== 1 ? 's' : ''}`;
  const parts = Object.entries(scope.filter)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v as string}`);
  return `Filter: ${parts.join(', ')}`;
}

export function ProfilesIndex({ onNew, onEdit }: Props) {
  const [profiles,  setProfiles]  = useState<PricingProfile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [groups,    setGroups]    = useState<CustomerGroup[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([getProfiles(), getCustomers(), getGroups()])
      .then(([p, c, g]) => { setProfiles(p); setCustomers(c); setGroups(g); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteProfile(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Pricing Profiles</h1>
        <button className="btn btn-primary" onClick={onNew}>+ New Profile</button>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      {loading && <p className="loading">Loading…</p>}

      {!loading && profiles.length === 0 && (
        <div className="card empty-state">
          No pricing profiles yet.{' '}
          <button onClick={onNew}>Create the first one.</button>
        </div>
      )}

      {profiles.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Applies to</th>
                <th>Adjustment</th>
                <th>Products</th>
                <th style={{ width: 60 }}>Priority</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td className="scope-cell">
                    {describeCustomerScope(p.customerScope, customers, groups)}
                  </td>
                  <td>{describeAdjustment(p)}</td>
                  <td className="scope-cell scope-line">{describeProductScope(p)}</td>
                  <td style={{ textAlign: 'center' }}>{p.priority}</td>
                  <td className="col-actions">
                    <button className="btn btn-sm" onClick={() => onEdit(p)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id, p.name)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PriceLookup />
    </div>
  );
}
