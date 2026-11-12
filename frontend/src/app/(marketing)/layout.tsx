import '@/theme/marketing/index.css';
import {MarketingHeader} from '@/components/marketing/MarketingHeader';
import {MarketingFooter} from '@/components/marketing/MarketingFooter';
import {RevealObserver} from '@/components/marketing/motion/RevealObserver';

export default function MarketingLayout({children}: {children: React.ReactNode}) {
  return (
    <div className="marketing-page">
      <MarketingHeader />
      <main id="main-content" className="marketing-main" tabIndex={-1}>{children}</main>
      <MarketingFooter />
      <RevealObserver />
    </div>
  );
}
