import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '🚀 Agent Launchpad | MEDICI City',
  description: 'Launch and trade AI agents on Flow Testnet. Create, fund, and bond AI agents in the MEDICI decentralized ecosystem.',
  keywords: 'AI agents, blockchain, Flow, launchpad, NFT, cryptocurrency, MEDICI',
  openGraph: {
    title: '🚀 Agent Launchpad | MEDICI City',
    description: 'Launch and trade AI agents on Flow Testnet',
    type: 'website',
  },
};

export default function LaunchpadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="launchpad-layout">
      {children}
    </div>
  );
} 