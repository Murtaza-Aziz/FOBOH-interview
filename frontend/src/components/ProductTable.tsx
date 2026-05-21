import { useEffect, useRef } from 'react';
import type { Product } from '../types';

interface Props {
  products: Product[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: (ids: string[], checked: boolean) => void;
}

export function ProductTable({ products, selectedIds, onToggle, onSelectAll }: Props) {
  const selectAllRef = useRef<HTMLInputElement>(null);

  const visibleIds   = products.map((p) => p.id);
  const selectedCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allChecked   = products.length > 0 && selectedCount === products.length;
  const someChecked  = selectedCount > 0 && !allChecked;

  // Drive the indeterminate state via a ref — React doesn't support it as a prop.
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someChecked;
    }
  }, [someChecked]);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="col-check">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allChecked}
                onChange={(e) => onSelectAll(visibleIds, e.target.checked)}
                title="Select / deselect all visible"
              />
            </th>
            <th>Title</th>
            <th>SKU</th>
            <th>Brand</th>
            <th>Sub-category / Segment</th>
            <th>Base Price</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const selected = selectedIds.has(p.id);
            return (
              <tr
                key={p.id}
                className={selected ? 'row-selected' : ''}
                onClick={() => onToggle(p.id)}
                style={{ cursor: 'pointer' }}
              >
                <td className="col-check">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggle(p.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td>{p.title}</td>
                <td className="col-sku">{p.sku}</td>
                <td>{p.brand}</td>
                <td>{p.subCategory} / {p.segment}</td>
                <td className="col-price">${p.basePrice.toFixed(2)}</td>
              </tr>
            );
          })}
          {products.length === 0 && (
            <tr className="empty-row">
              <td colSpan={6}>No products match the current filters.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
