import Image from 'next/image';

interface GranaLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: { width: 80, height: 80 },
  md: { width: 140, height: 140 },
  lg: { width: 200, height: 200 },
};

export default function GranaLogo({ size = 'md', className = '' }: GranaLogoProps) {
  const { width, height } = sizes[size];
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Image
        src="/grana-logo.svg"
        alt="Grana"
        width={width}
        height={height}
        priority
        className="object-contain"
      />
    </div>
  );
}
