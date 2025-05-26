import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, PlusCircle, Building } from 'lucide-react'; // Added Building icon

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span className="font-bold text-lg">Nyumba Finder</span>
        </Link>
        <nav className="flex flex-1 items-center space-x-4">
          <Button variant="ghost" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
           <Button variant="ghost" asChild>
            <Link href="/properties">
              <Building className="mr-2 h-4 w-4" /> {/* Changed icon */}
              Properties
            </Link>
          </Button>
        </nav>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/list-property">
              <PlusCircle className="mr-2 h-4 w-4" /> List Property
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
