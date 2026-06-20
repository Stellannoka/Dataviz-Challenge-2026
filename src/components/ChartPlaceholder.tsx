interface ChartPlaceholderProps {
  label: string;
  height?: number;
}

export default function ChartPlaceholder({
  label,
  height = 420,
}: ChartPlaceholderProps) {
  return (
    <div
      className="flex w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-center"
      style={{ height }}
    >
      <div className="px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Chart goes here
        </p>
        <p className="mt-1 text-base text-slate-500">{label}</p>
      </div>
    </div>
  );
}