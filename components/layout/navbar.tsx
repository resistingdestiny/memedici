"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { cn } from "@/lib/utils";
import { 
  Menu, 
  X, 
  Home,
  LayoutDashboard, 
  Users, 
  Compass
} from "lucide-react";
import { useWallet } from "@/lib/stores/use-wallet";

export function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { isConnected, connect } = useWallet();
  
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
            {!isConnected ? (
              <Button onClick={connect} variant="outline" size="sm" className="tech-border">
                Connect Wallet
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="tech-border">
                0x12...8F9E
              </Button>
            )}
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
            
            {!isConnected ? (
              <Button onClick={connect} className="mt-2">
                Connect Wallet
              </Button>
            ) : (
              <Button variant="outline" className="mt-2">
                0x12...8F9E
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}