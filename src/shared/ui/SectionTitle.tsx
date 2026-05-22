interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function SectionTitle({ eyebrow, title, description }: SectionTitleProps) {
  return (
    <div className="space-y-1">
      {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.18em] text-[#006bff]">{eyebrow}</p> : null}
      <h1 className="text-3xl font-black leading-tight text-ink md:text-4xl">{title}</h1>
      {description ? <p className="text-sm leading-6 text-slate-600 md:text-base">{description}</p> : null}
    </div>
  );
}
