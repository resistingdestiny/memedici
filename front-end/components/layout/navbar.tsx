"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { cn } from "@/lib/utils";
import { 
  Menu, 
  X, 
  Home,
  LayoutDashboard, 
  Users, 
  Compass,
  Settings,
  Building,
  Rocket
} from "lucide-react";
import { useWallet, useWalletConnection } from "@/lib/stores/use-wallet";

export function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { isConnected } = useWallet();
  const { connect, disconnect, connectors } = useWalletConnection();
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const navItems = [
    { href: "/", label: "Home", icon: <Home className="h-5 w-5 mr-2" /> },
    { href: "/explore", label: "Explore", icon: <Compass className="h-5 w-5 mr-2" /> },
    { href: "/agents", label: "Creators", icon: <Users className="h-5 w-5 mr-2" /> },
    { href: "/studios", label: "Studios", icon: <Building className="h-5 w-5 mr-2" /> },
    { href: "/launchpad", label: "Launchpad", icon: <Rocket className="h-5 w-5 mr-2" /> },
    { href: "/tools", label: "Tools", icon: <Settings className="h-5 w-5 mr-2" /> },
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5 mr-2" /> },
  ];

  return (
    <header 
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300",
        isScrolled || isOpen ? "bg-background/95 backdrop-blur-sm border-b" : "bg-transparent"
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold font-space text-primary">MEMEDICI</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary relative group",
                pathname === item.href ? "text-primary" : "text-muted-foreground"
              )}
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
              }) => {
                // Note: If your app doesn't use authentication, you
                // can remove all 'authenticationStatus' checks
                const ready = mounted && authenticationStatus !== 'loading';
                const connected =
                  ready &&
                  account &&
                  chain &&
                  (!authenticationStatus ||
                    authenticationStatus === 'authenticated');

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      'style': {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <Button 
                            onClick={openConnectModal} 
                            variant="outline" 
                            size="sm" 
                            className="tech-border"
                          >
                            Connect Wallet
                          </Button>
                        );
                      }

                      if (chain.unsupported) {
                        return (
                          <Button 
                            onClick={openChainModal} 
                            variant="destructive" 
                            size="sm"
                          >
                            Wrong network
                          </Button>
                        );
                      }

                      return (
                        <div style={{ display: 'flex', gap: 12 }}>
                          <Button
                            onClick={openChainModal}
                            variant="outline"
                            size="sm"
                            className="tech-border"
                            style={{ display: 'flex', alignItems: 'center' }}
                          >
                            {chain.hasIcon && (
                              <div
                                style={{
                                  background: chain.iconBackground,
                                  width: 12,
                                  height: 12,
                                  borderRadius: 999,
                                  overflow: 'hidden',
                                  marginRight: 4,
                                }}
                              >
                                {chain.iconUrl && (
                                  <img
                                    alt={chain.name ?? 'Chain icon'}
                                    src={chain.iconUrl}
                                    style={{ width: 12, height: 12 }}
                                  />
                                )}
                              </div>
                            )}
                            {chain.name}
                          </Button>

                          <Button 
                            onClick={openAccountModal} 
                            variant="outline" 
                            size="sm" 
                            className="tech-border"
                          >
                            {account.displayName}
                            {account.displayBalance
                              ? ` (${account.displayBalance})`
                              : ''}
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
          
          <ModeToggle />
          
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>
      
      {isOpen && (
        <div className="md:hidden border-t factory-gradient">
          <div className="container py-4 flex flex-col gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center text-sm font-medium p-3 rounded-md transition-colors tech-card",
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-primary/5"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
            
            <div className="mt-2">
              <ConnectButton />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}