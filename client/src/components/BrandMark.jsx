export default function BrandMark({ showText = true, showVersion = true, version = "v0.9.4" }) {
  return (
    <div className="inline-flex items-center gap-2 select-none">
      {/* Brand Icon: rounded rectangle with clean staple shape */}
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0f0f10] shadow-2xs">
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7 8.5V6.5C7 4.567 8.567 3 10.5 3H13.5C15.433 3 17 4.567 17 6.5V11C17 12.933 15.433 14.5 13.5 14.5H10.5C8.567 14.5 7 16.067 7 18V18.5C7 19.88 8.12 21 9.5 21H13.5C14.88 21 16 19.88 16 18.5"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showText && (
        <span className="text-[19px] font-bold tracking-tight text-[#111111]">
          Staple
        </span>
      )}

      {showVersion && (
        <span className="rounded-[4px] border border-[#dcd7cb] bg-[#f4f1ea] px-1.5 py-[1px] font-mono text-[9.5px] font-medium tracking-tight text-[#787670]">
          {version}
        </span>
      )}
    </div>
  );
}
