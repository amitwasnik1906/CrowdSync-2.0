export default function Button({ children, variant = "primary", className = "", ...props }) {
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    ghost: "hover:bg-slate-100 text-slate-700",
  };
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
