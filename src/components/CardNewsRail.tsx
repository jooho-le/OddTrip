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
        <article key={item.title} className={`reveal-card min-h-36 rounded-lg p-5 shadow-soft ${item.tone}`} style={{ animationDelay: `${index * 100}ms` }}>
          <p className="text-xs font-black uppercase opacity-70">{item.kicker}</p>
          <h2 className="mt-5 text-xl font-black leading-7">{item.title}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 opacity-80">{item.description}</p>
        </article>
      ))}
    </div>
  );
}
