/**
 * Interactive demo of the pricing resolver.
 *
 * Lets you pick any customer + product combination and see which profile wins,
 * what price they pay, and the full precedence explanation from the backend.
 */

import { useEffect, useState } from 'react';
import { getCustomers, getProducts, resolvePrice } from '../api/client';
import type { Customer, Product, ResolveResponse } from '../types';

export function PriceLookup() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products,  setProducts]  = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [productId,  setProductId]  = useState('');
  const [result, setResult] = useState<ResolveResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCustomers(), getProducts({})]).then(([c, p]) => {
      setCustomers(c);
      setProducts(p);
      if (c.length > 0) setCustomerId(c[0]?.id ?? '');
      if (p.length > 0) setProductId(p[0]?.id ?? '');
    }).catch(console.error);
  }, []);

  async function handleLookup() {
    if (!customerId || !productId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await resolvePrice(customerId, productId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed.');
    } finally {
      setLoading(false);
    }
  }

  // Clear result when selection changes.
  function onCustomerChange(id: string) { setCustomerId(id); setResult(null); }
  function onProductChange(id: string)  { setProductId(id);  setResult(null); }

  return (
    <div className="card">
      <h2>Price Lookup</h2>
      <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: '.9rem' }}>
        Run the pricing resolver for any customer + product pair to see which profile wins and why.
      </p>

      <div className="lookup-form">
        <select value={customerId} onChange={(e) => onCustomerChange(e.target.value)}>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={productId} onChange={(e) => onProductChange(e.target.value)}>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={handleLookup} disabled={loading || !customerId || !productId}>
          {loading ? 'Looking up…' : 'Lookup Price'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {result && (
        <div className="lookup-result">
          {/* Final price — the number the supplier sees on the invoice */}
          <div className="lookup-price">
            ${result.finalPrice.toFixed(2)}
          </div>

          {/* Plain-English reason from the backend */}
          <p className="explanation">{result.explanation}</p>

          {/* Show all rules that matched so the supplier can see what was considered */}
          {result.matchedProfiles.length > 1 && (
            <>
              <strong style={{ fontSize: '.85rem' }}>All matching rules considered:</strong>
              <ul className="matched-list" style={{ marginTop: '.4rem' }}>
                {result.matchedProfiles.map((m, i) => (
                  <li key={m.profileId}>
                    <span className={i === 0 ? 'winner-badge' : 'loser-badge'}>
                      {i === 0 ? '✓ Applied' : '✗ Overridden'}
                    </span>
                    {' — '}{m.profileName} (would charge ${m.candidatePrice.toFixed(2)})
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
