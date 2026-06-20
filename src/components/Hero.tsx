export default function Hero() {
  return (
    <header className="mx-auto max-w-[720px] px-0 pt-24 pb-8 md:pt-28">
      <h1 className="text-center font-serif font-bold tracking-tight text-slate-900 text-[clamp(1.75rem,1.4rem+2vw,2.5rem)] leading-[1.1]">
        The Cost of the Gap
      </h1>

      <p className="mt-3 text-center text-slate-500 text-[clamp(0.9rem,0.85rem+0.3vw,1.05rem)]">
        How climate risk becomes human and economic loss across the Pacific
      </p>

      {/* Author + date */}
      <div className="mt-5 text-center text-slate-600 text-[clamp(0.75rem,0.72rem+0.15vw,0.85rem)]">
        <p>
          By{" "}
          <a
            href="https://www.linkedin.com/in/stellamaris-nnoka-71aa4a239/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-sky-700"
          >
            Stellamaris Nnoka
          </a>
        </p>
        <p className="mt-1 text-slate-400">August 25, 2026</p>
      </div>

      <div className="mt-8 space-y-5 text-slate-700 text-[clamp(0.9rem,0.85rem+0.35vw,1rem)] leading-[1.65]">
        <p>
          Human&ndash;climate change has made disaster a recurring fact of life across the Pacific. For the region's small island states (SIDS), a single storm or flood can reach a large share of the population in a single year, and erase a meaningful slice of the economy along with it.
        </p>
        <p>
         The damage, though, is not evenly shared. Some nations are reached again and again, losing more of their people and their output to each event than others ever do. What separates them is not only the weather they face, but a deeper gap — between the harm climate change is likely to do, and each nation's capacity to convert resources into protection against it.
        </p>
      </div>
    </header>
  );
}