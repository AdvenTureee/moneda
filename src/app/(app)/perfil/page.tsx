import { Suspense } from 'react';
import AppShell from '@/components/AppShell';
import ProfileSkeleton from '@/components/ProfileSkeleton';
import ProfileLoader from './ProfileLoader';

export const dynamic = 'force-dynamic';

export default function PerfilPage() {
  return (
    <AppShell>
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileLoader />
      </Suspense>
    </AppShell>
  );
}
