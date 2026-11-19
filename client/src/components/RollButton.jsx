export default function RollButton({
  children,
  type = "button",
  disabled = false,
  onClick,
  className = "",
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition-all duration-200 hover:bg-neutral-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <span className="relative inline-flex overflow-hidden">
        <span className="transition-transform duration-300 ease-out group-hover:-translate-y-full">
          {children}
        </span>
        <span
          aria-hidden="true"
          className="absolute inset-0 translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0"
        >
          {children}
        </span>
      </span>
    </button>
  );
}