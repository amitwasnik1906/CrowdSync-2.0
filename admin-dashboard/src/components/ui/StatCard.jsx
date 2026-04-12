export default function StatCard({ icon: Icon, label, value, accent = "indigo" }) {
  const accents = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className={`rounded-lg p-3 ${accents[accent]}`}>
        {Icon && <Icon size={22} />}
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-2xl font-semibold text-slate-800">{value}</div>
      </div>
    </div>
  );
}
