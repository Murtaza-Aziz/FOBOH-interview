interface FilterValues {
  q: string;
  subCategory: string;
  segment: string;
  brand: string;
}

interface Props {
  values: FilterValues;
  onChange: (key: keyof FilterValues, value: string) => void;
}

export function ProductFilters({ values, onChange }: Props) {
  const set = (key: keyof FilterValues) =>
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(key, e.target.value);

  return (
    <div className="filters">
      <input
        placeholder="Search title or SKU…"
        value={values.q}
        onChange={set('q')}
      />
      <input
        placeholder="Sub-category"
        value={values.subCategory}
        onChange={set('subCategory')}
      />
      <input
        placeholder="Segment"
        value={values.segment}
        onChange={set('segment')}
      />
      <input
        placeholder="Brand"
        value={values.brand}
        onChange={set('brand')}
      />
    </div>
  );
}
