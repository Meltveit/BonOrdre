import { Wine } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-start gap-2", className)}>
      <Wine className="h-8 w-8 text-primary mt-1" />
      <div className='flex flex-col'>
        <span className="font-semibold font-headline text-xl leading-none">Booze of Norway</span>
        <span className='text-sm text-muted-foreground'>B2B Portal</span>
      </div>
    </div>
  );
}
