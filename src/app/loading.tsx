
import { Home } from 'lucide-react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[200] flex h-screen w-screen flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-lg bg-card p-8 shadow-2xl border">
        <Home className="h-16 w-16 text-primary animate-pulse-slow" />
        <p className="text-xl font-medium text-foreground mt-2">Loading Nyumba Finder...</p>
        <p className="text-sm text-muted-foreground">Finding your next home.</p>
      </div>
    </div>
  );
}
