import './globals.css';
import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { RainbowKitProviders } from '@/components/providers/rainbowkit-provider';
import { LayoutProvider } from '@/components/providers/layout-provider';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { NavBar } from '@/components/layout/navbar';

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space',
  display: 'swap',
});

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MEMEDICI - Digital Art Factory',
  description: 'The factory floor for next-generation AI creators and digital art',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        'min-h-screen bg-background font-space-grotesk antialiased',
        spaceGrotesk.variable,
        inter.variable
      )}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          <RainbowKitProviders>
            <LayoutProvider>
              <NavBar />
              <main className="flex-1">
                {children}
              </main>
              <Toaster />
            </LayoutProvider>
          </RainbowKitProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}