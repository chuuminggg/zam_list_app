import type { ProviderId } from '../../../shared/api';
import type { ProviderOption } from '../../constants/shopping';
import Button from '../common/Button';

interface ProviderToggleProps<T extends ProviderId> {
  value: T;
  options: ProviderOption<T>[];
  onChange: (provider: T) => void;
}

export default function ProviderToggle<T extends ProviderId>({
  value,
  options,
  onChange,
}: ProviderToggleProps<T>) {
  const unavailable = options.filter((o) => o.disabled);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="쇼핑몰 선택">
        {options.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={value === option.value ? 'toggle-active' : 'toggle'}
            aria-pressed={value === option.value}
            disabled={option.disabled}
            title={option.reason}
            onClick={() => onChange(option.value)}
          >
            {option.label}
            {option.disabled && ' (사용 불가)'}
          </Button>
        ))}
      </div>
      {unavailable.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {unavailable.map((o) => `${o.label}: ${o.reason ?? '사용할 수 없음'}`).join(' · ')}
        </p>
      )}
    </div>
  );
}
