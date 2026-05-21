'use client';

import {
  Hamburger,
  Car,
  GameController,
  Pill,
  House,
  Books,
  Package,
  Briefcase,
  Rocket,
  TrendUp,
  Gift,
  Receipt,
  Sparkle,
  Hourglass,
  Warning,
  MagnifyingGlass,
  Lightbulb,
  ChartPieSlice,
  type IconProps,
} from '@phosphor-icons/react';

const iconMap: Record<string, React.ComponentType<IconProps>> = {
  Hamburger,
  Car,
  GameController,
  Pill,
  House,
  Books,
  Package,
  Briefcase,
  Rocket,
  TrendUp,
  Gift,
  Receipt,
  Sparkle,
  Hourglass,
  Warning,
  MagnifyingGlass,
  Lightbulb,
  ChartPieSlice,
};

const emojiToIcon: Record<string, string> = {
  '🍔': 'Hamburger',
  '🚗': 'Car',
  '🎮': 'GameController',
  '💊': 'Pill',
  '🏠': 'House',
  '📚': 'Books',
  '📦': 'Package',
  '⚠️': 'Warning',
  '💡': 'Lightbulb',
  '🏷️': 'Tag',
  '💰': 'CurrencyDollar',
  '📊': 'ChartBar',
  '🎯': 'Target',
  '🔔': 'Bell',
  '📝': 'NotePencil',
  '✅': 'CheckCircle',
  '❌': 'XCircle',
  '⭐': 'Star',
};

function normalizeIcon(name: string): string {
  return emojiToIcon[name] ?? name;
}

interface IconRendererProps {
  name: string;
  size?: number;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  className?: string;
  color?: string;
}

export default function Icon({ name, size = 20, weight = 'regular', className, color }: IconRendererProps) {
  const iconName = normalizeIcon(name);
  const Component = iconMap[iconName];
  if (!Component) return <span className={className}>{iconName}</span>;
  return <Component size={size} weight={weight} className={className} color={color} />;
}
