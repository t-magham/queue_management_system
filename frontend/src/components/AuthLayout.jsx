import { Link } from 'react-router-dom';
import { BackLink, BrandMark } from './ui.jsx';
import { siteName } from '../lib/format.js';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,34rem)]">
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 rounded-lg font-semibold tracking-tight">
            <BrandMark />
            <span className="whitespace-nowrap">{siteName}</span>
          </Link>
          <BackLink to="/">Home</BackLink>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-14 animate-rise">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">{title}</h1>
          {subtitle && <p className="mt-2 text-mute">{subtitle}</p>}
          <div className="mt-10">{children}</div>
          {footer && <div className="mt-8 text-sm text-mute">{footer}</div>}
        </div>
      </main>

      <aside className="relative hidden overflow-hidden bg-ink text-paper lg:flex lg:flex-col lg:justify-end lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_80%_10%,rgb(194_65_12/0.35),transparent_70%)]" />
        <div className="absolute right-[-2rem] top-10 select-none font-mono text-[15rem] font-medium leading-none tracking-tighter text-paper/[0.05]">
          042
        </div>
        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-paper/50">For the people behind the counter</p>
          <p className="mt-5 max-w-[24rem] text-2xl font-medium leading-snug tracking-tight">
            Call the next person with one tap. Everyone in line sees it the moment you do.
          </p>
          <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-paper/15 pt-6 text-sm">
            <div>
              <dt className="text-paper/50">Updates</dt>
              <dd className="mt-1 font-medium">Live, over WebSocket</dd>
            </div>
            <div>
              <dt className="text-paper/50">Guests need</dt>
              <dd className="mt-1 font-medium">A 6-digit code</dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );
}
