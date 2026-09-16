import Button from '../common/Button';

interface ProviderToggleProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (provider: T) => void;
}

export default function ProviderToggle<T extends string>({ value, options, onChange }: ProviderToggleProps<T>) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="쇼핑몰 선택">
      {options.map((option) => (
        <Button
          key={option.value}
          size="sm"
          variant={value === option.value ? 'toggle-active' : 'toggle'}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
