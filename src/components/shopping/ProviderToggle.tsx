import type { StockProviderId } from '../../../shared/api';
import { STOCK_PROVIDERS } from '../../constants/stock';
import Button from '../common/Button';

interface ProviderToggleProps {
  value: StockProviderId;
  onChange: (provider: StockProviderId) => void;
}

export default function ProviderToggle({ value, onChange }: ProviderToggleProps) {
  return (
    <div className="flex gap-2" role="group" aria-label="쇼핑몰 선택">
      {STOCK_PROVIDERS.map(({ value: provider, label }) => (
        <Button
          key={provider}
          size="sm"
          variant={value === provider ? 'toggle-active' : 'toggle'}
          aria-pressed={value === provider}
          onClick={() => onChange(provider)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
