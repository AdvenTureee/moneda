'use client';

import { motion } from 'framer-motion';
import { usePrivacy } from '@/context/PrivacyContext';

interface PrivateValueProps {
  value: string;
  className?: string;
  'aria-label'?: string;
}

export function maskValue(value: string): string {
  return value.replace(/\d/g, '•');
}

export default function PrivateValue({ value, className, 'aria-label': ariaLabel }: PrivateValueProps) {
  const { isPrivate } = usePrivacy();

  if (!isPrivate) {
    return <span className={className}>{value}</span>;
  }

  const masked = maskValue(value);

  return (
    <motion.span
      key={masked}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={className}
      aria-label={ariaLabel ?? value}
    >
      {masked}
    </motion.span>
  );
}
