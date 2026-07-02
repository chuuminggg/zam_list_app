import type { SelectHTMLAttributes } from 'react';
import { FIELD_BASE, FOCUS_RING, type Accent } from './fieldStyles';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  accent?: Accent;
}

export default function Select({ accent = 'indigo', className = '', ...props }: SelectProps) {
  return <select className={`${FIELD_BASE} ${FOCUS_RING[accent]} ${className}`} {...props} />;
}
