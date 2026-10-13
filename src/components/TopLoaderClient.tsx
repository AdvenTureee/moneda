'use client';

import dynamic from 'next/dynamic';

const NextTopLoader = dynamic(() => import('nextjs-toploader'), { ssr: false });

export default function TopLoaderClient() {
  return <NextTopLoader color="#A8C5E0" height={3} showSpinner={false} />;
}
