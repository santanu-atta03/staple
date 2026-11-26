export default function BrandMark({ showText = true, showVersion = true, version = "v0.9.4" }) {
  return (
    <div className="inline-flex items-center gap-2 select-none">

      {showText && (
        <img src="/staple_logo.svg" alt="Staple Logo" className="h-7" />
      )}

      {showVersion && (
        <span className="rounded-[4px] border border-[#dcd7cb] bg-[#f4f1ea] px-1.5 py-[1px] font-mono text-[9.5px] font-medium tracking-tight text-[#787670]">
          {version}
        </span>
      )}
    </div>
  );
}
