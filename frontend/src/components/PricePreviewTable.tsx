import type { PreviewItem } from '../types';

interface Props {
  items: PreviewItem[];
}

export function PricePreviewTable({ items }: Props) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Base Price</th>
            <th>New Price</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const diff = item.newPrice - item.basePrice;
            const diffClass =
              diff < 0 ? 'price-down' : diff > 0 ? 'price-up' : 'price-same';
            const diffLabel =
              diff === 0
                ? '—'
                : `${diff > 0 ? '+' : ''}$${diff.toFixed(2)}`;

            return (
              <tr key={item.productId}>
                <td>{item.title}</td>
                <td className="col-sku">{item.sku}</td>
                <td className="col-price">${item.basePrice.toFixed(2)}</td>
                <td className="col-price">${item.newPrice.toFixed(2)}</td>
                <td className={`col-price ${diffClass}`}>{diffLabel}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
