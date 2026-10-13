'use client';

import dynamic from 'next/dynamic';

const SpeedInsights = dynamic(
  () => import('@vercel/speed-insights/next').then((mod) => mod.SpeedInsights),
  { ssr: false },
);

export default function SpeedInsightsClient() {
  return <SpeedInsights />;
}
