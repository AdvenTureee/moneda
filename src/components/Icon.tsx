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
};

interface IconRendererProps {
  name: string;
  size?: number;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  className?: string;
  color?: string;
}

export default function Icon({ name, size = 20, weight = 'regular', className, color }: IconRendererProps) {
  const Component = iconMap[name];
  if (!Component) return <span className={className}>{name}</span>;
  return <Component size={size} weight={weight} className={className} color={color} />;
}
