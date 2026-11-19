export default function BrandMark({ size = 28, showText = true }) {
  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <rect width="32" height="32" rx="8" fill="#FAFAFA" />
        <path
          d="M11 13V10.5C11 9.11929 12.1193 8 13.5 8H18.5C19.8807 8 21 9.11929 21 10.5V14.5C21 15.6046 20.1046 16.5 19 16.5H13C11.8954 16.5 11 17.3954 11 18.5V21.5C11 22.8807 12.1193 24 13.5 24H18.5C19.8807 24 21 22.8807 21 21.5V19"
          stroke="#09090B"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      </svg>
      {showText && (
        <span className="text-xl font-bold tracking-tight text-white">
          staple
        </span>
      )}
    </div>
  );
}