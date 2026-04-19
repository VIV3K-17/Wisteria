import React from 'react';
import { Menu, Home, Clock3, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

const NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'history', label: 'History', icon: Clock3 },
  { key: 'sos', label: 'SOS', icon: ShieldAlert }
];

const DashboardNav = ({ activeView, onChangeView, open, onOpenChange, userName }) => {
  const handleSelect = view => {
    onChangeView(view);
    onOpenChange(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className={`fixed left-4 top-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-card/95 text-foreground shadow-xl backdrop-blur-xl transition-transform hover:scale-105 ${open ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        aria-label="Open dashboard navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[20rem] p-0 sm:max-w-[20rem]">
          <div className="flex h-full flex-col bg-card">
            <SheetHeader className="border-b border-border/60 px-6 py-6 text-left">
              <div>
                <SheetTitle className="text-xl font-bold text-foreground">SafeTravel</SheetTitle>
                <SheetDescription className="mt-1 text-sm text-muted-foreground">
                  Dashboard navigation for {userName || 'your account'}
                </SheetDescription>
              </div>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-2 px-4 py-5">
              {NAV_ITEMS.map(item => {
                const isActive = activeView === item.key;
                const Icon = item.icon;
                return (
                  <Button
                    key={item.key}
                    type="button"
                    variant={isActive ? 'default' : 'ghost'}
                    className={`justify-start rounded-2xl h-12 px-4 text-sm font-semibold ${isActive ? 'gradient-primary text-primary-foreground shadow-lg' : 'text-foreground hover:bg-primary/10'}`}
                    onClick={() => handleSelect(item.key)}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </Button>
                );
              })}
            </div>

            <div className="border-t border-border/60 px-4 py-4">
              <p className="rounded-2xl bg-background/70 px-4 py-3 text-xs text-muted-foreground">
                Use the hamburger button to toggle this dashboard panel.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default DashboardNav;