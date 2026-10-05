import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="py-6 md:px-8 md:py-0 border-t bg-secondary/50">
      <div className="container flex flex-col items-center justify-center gap-4 md:h-20 md:flex-row">
        <p className="text-center text-sm leading-loose text-muted-foreground">
          <span>&copy; {currentYear} Nyumba Finder. All rights reserved.</span>
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Privacy & Analytics
          </Link>
        </p>
      </div>
    </footer>
  );
}
