interface CardNewsItem {
  kicker: string;
  title: string;
  description: string;
  tone: string;
}

export function CardNewsRail({ items }: { items: CardNewsItem[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((item, index) => (
        <article key={item.title} className={`motion-card hover-lift pulse-sheen min-h-48 rounded-3xl border border-line p-6 shadow-card ${item.tone}`} style={{ animationDelay: `${index * 120}ms` }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.18em] opacity-70">{item.kicker}</p>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/22 text-xs font-black">{String(index + 1).padStart(2, '0')}</span>
          </div>
          <h2 className="mt-12 text-2xl font-black leading-8">{item.title}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 opacity-80">{item.description}</p>
        </article>
      ))}
    </div>
  );
}
