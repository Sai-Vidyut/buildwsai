export function HeroMobileVisual() {
  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden border border-[var(--color-line)] bg-[var(--color-black)] md:hidden"
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(250,250,250,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(250,250,250,0.5) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--satquery-purple)]/25 via-transparent to-[var(--razorflow-green)]/10" />
      <div className="absolute left-5 top-5 h-12 w-px bg-white/20" />
      <div className="absolute left-5 top-5 h-px w-12 bg-white/20" />
      <div className="absolute right-5 bottom-5 h-12 w-px bg-white/20" />
      <div className="absolute right-5 bottom-5 h-px w-12 bg-white/20" />
      <p className="absolute left-5 bottom-5 label-brand text-white/45 max-w-[12rem] leading-relaxed">
        12.9716° N · 77.5946° E
      </p>
      <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 flex justify-between items-center">
        <span className="label-brand text-[var(--satquery-purple)]/80">01</span>
        <span className="h-px flex-1 mx-4 bg-white/15" />
        <span className="label-brand text-[var(--razorflow-green)]/70">02</span>
        <span className="h-px flex-1 mx-4 bg-white/15" />
        <span className="label-brand text-[var(--docna-accent)]/70">03</span>
        <span className="h-px flex-1 mx-4 bg-white/15" />
        <span className="label-brand text-[var(--blueprint-accent)]/80">04</span>
      </div>
    </div>
  )
}
