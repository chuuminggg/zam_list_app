import type { InputHTMLAttributes } from 'react';
import { FIELD_BASE, FOCUS_RING, type Accent } from './fieldStyles';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  accent?: Accent;
}

export default function Input({ accent = 'indigo', className = '', ...props }: InputProps) {
  return <input className={`${FIELD_BASE} ${FOCUS_RING[accent]} ${className}`} {...props} />;
}
