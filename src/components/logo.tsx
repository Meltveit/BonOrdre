import { Wine } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Wine className="h-6 w-6 text-primary" />
      <span className="font-semibold font-headline text-lg">Booze B2B Portal</span>
    </div>
  );
}
