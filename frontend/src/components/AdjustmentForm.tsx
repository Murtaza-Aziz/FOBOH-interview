import type { Adjustment } from '../types';

interface Props {
  adjustment: Adjustment;
  onChange: (adj: Adjustment) => void;
}

export function AdjustmentForm({ adjustment, onChange }: Props) {
  // When kind changes, reset to sensible defaults so stale field values
  // from the previous kind don't leak into the new shape.
  function setKind(kind: Adjustment['kind']) {
    if (kind === 'FIXED')
      onChange({ kind: 'FIXED', direction: 'DECREASE', amount: 0 });
    else if (kind === 'PERCENTAGE')
      onChange({ kind: 'PERCENTAGE', direction: 'DECREASE', percent: 10 });
    else
      onChange({ kind: 'CUSTOM_PRICE', price: 0 });
  }

  function setDirection(direction: 'INCREASE' | 'DECREASE') {
    if (adjustment.kind === 'FIXED')
      onChange({ ...adjustment, direction });
    else if (adjustment.kind === 'PERCENTAGE')
      onChange({ ...adjustment, direction });
  }

  return (
    <div>
      <div className="form-group" style={{ marginBottom: '.9rem' }}>
        <label>Type</label>
        <div className="radio-group">
          {(['FIXED', 'PERCENTAGE', 'CUSTOM_PRICE'] as const).map((kind) => (
            <label key={kind} className="radio-label">
              <input
                type="radio"
                checked={adjustment.kind === kind}
                onChange={() => setKind(kind)}
              />
              {kind === 'FIXED' ? 'Fixed amount ($)' :
               kind === 'PERCENTAGE' ? 'Percentage (%)' :
               'Custom price ($)'}
            </label>
          ))}
        </div>
      </div>

      {adjustment.kind !== 'CUSTOM_PRICE' && (
        <div className="form-group" style={{ marginBottom: '.9rem' }}>
          <label>Direction</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                checked={adjustment.direction === 'DECREASE'}
                onChange={() => setDirection('DECREASE')}
              />
              Decrease (discount)
            </label>
            <label className="radio-label">
              <input
                type="radio"
                checked={adjustment.direction === 'INCREASE'}
                onChange={() => setDirection('INCREASE')}
              />
              Increase (markup)
            </label>
          </div>
        </div>
      )}

      {adjustment.kind === 'FIXED' && (
        <div className="form-group">
          <label>Amount ($)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={adjustment.amount}
            onChange={(e) =>
              onChange({ ...adjustment, amount: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
      )}

      {adjustment.kind === 'PERCENTAGE' && (
        <div className="form-group">
          <label>Percent (0–100)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={adjustment.percent}
            onChange={(e) =>
              onChange({ ...adjustment, percent: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
      )}

      {adjustment.kind === 'CUSTOM_PRICE' && (
        <div className="form-group">
          <label>Price ($)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={adjustment.price}
            onChange={(e) =>
              onChange({ ...adjustment, price: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
      )}
    </div>
  );
}
