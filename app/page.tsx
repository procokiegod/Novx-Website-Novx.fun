import { Navbar } from '@/components/navbar';
import { AuroraBackground } from '@/components/aurora-background';
import { LandingPage } from '@/components/landing-page';

export default function Home() {
  return (
    <>
      <AuroraBackground />
      <Navbar />
      <LandingPage />
    </>
  );
}
