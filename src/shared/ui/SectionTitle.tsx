interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function SectionTitle({ eyebrow, title, description }: SectionTitleProps) {
  return (
    <div className="space-y-2">
      {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.2em] text-[#fd267a]">{eyebrow}</p> : null}
      <h1 className="text-4xl font-black leading-[0.98] tracking-[-0.045em] text-[#111111] md:text-5xl">{title}</h1>
      {description ? <p className="max-w-3xl text-sm font-bold leading-6 text-slate-600 md:text-base">{description}</p> : null}
    </div>
  );
}
