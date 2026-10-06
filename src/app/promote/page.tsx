import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, Mail, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Promote Your Property | NyumbaFinder',
  description: 'Give your NyumbaFinder property listing more visibility with sponsored placement in relevant searches.',
  alternates: { canonical: '/promote' },
};

const benefits = [
  'A clear Sponsored label so promotion is transparent to property seekers',
  'Additional ranking visibility among otherwise relevant results',
  'Placement that still respects the visitor’s location and search filters',
  'Promotion periods with defined start and end dates',
];

export default async function PromotePage({ searchParams }: { searchParams: Promise<{ property?: string }> }) {
  const { property } = await searchParams;
  const subject = encodeURIComponent('NyumbaFinder sponsored listing enquiry');
  const body = encodeURIComponent('Hello NyumbaFinder,\n\nI would like to promote my property listing on NyumbaFinder.' + (property ? '\n\nProperty ID: ' + property : '') + '\n\nPlease share the available sponsored placement options, current pricing and payment instructions.\n\nThank you.');
  const emailHref = 'mailto:info@nyumba-finder.com?subject=' + subject + '&body=' + body;

  return (
    <main className="py-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        <section className="relative overflow-hidden rounded-3xl border bg-[#f5f2e9] px-6 py-10 shadow-sm md:px-10 md:py-14">
          <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-primary/15" />
          <div aria-hidden="true" className="absolute -right-8 bottom-[-7rem] h-72 w-72 rounded-full border border-accent/20" />
          <div className="relative max-w-3xl">
            <div className="flex items-center gap-2 text-primary"><Sparkles className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[0.18em]">NyumbaFinder Promotion</span></div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">Put your property in front of more relevant seekers.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">Sponsored placement gives an eligible listing additional visibility in relevant NyumbaFinder searches. It does not replace relevance, location matching or normal search filters.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-11 rounded-xl"><a href={emailHref}><Mail className="mr-2 h-4 w-4" />Request sponsored placement</a></Button>
              <Button variant="outline" asChild className="h-11 rounded-xl bg-background"><Link href="/list-property">List a property first <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Contact <a className="font-medium text-foreground underline underline-offset-4" href="mailto:info@nyumba-finder.com">info@nyumba-finder.com</a> for current rates and payment instructions.</p>
          </div>
        </section>
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6 md:p-7"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">What you receive</p><h2 className="mt-2 text-xl font-semibold tracking-tight">A more visible listing, not a different search experience.</h2><div className="mt-5 space-y-3">{benefits.map((item) => <div key={item} className="flex gap-3 text-sm leading-6"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Check className="h-3 w-3" /></span><span>{item}</span></div>)}</div></div>
          <div className="rounded-2xl border bg-card p-6 md:p-7"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">How it works</p><div className="mt-5 space-y-5">{[['01','Publish your property','Create an active listing with accurate details and genuine photos.'],['02','Request sponsored placement','Email our team and tell us which property you want to promote.'],['03','Arrange payment','We confirm the available placement and current payment instructions.'],['04','We activate the promotion','Once approved and paid, the promotion runs for the agreed period and is clearly marked Sponsored.']].map(([number,title,text]) => <div key={number} className="flex gap-4"><span className="text-xs font-semibold text-primary">{number}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div></div>)}</div></div>
        </section>
        <p className="mt-6 text-center text-xs text-muted-foreground">Sponsored placement does not guarantee enquiries, views or a transaction. Listings must continue to meet NyumbaFinder’s listing rules.</p>
      </div>
    </main>
  );
}