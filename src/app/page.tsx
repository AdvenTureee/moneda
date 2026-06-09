import HomeLanding from '@/components/home/HomeLanding';

export default function HomePage() {
  return <HomeLanding whatsappUrl={process.env.NEXT_PUBLIC_WHATSAPP_URL || '/signup'} />;
}
