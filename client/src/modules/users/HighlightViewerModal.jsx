import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function HighlightViewerModal({
  isOpen,
  highlight,
  onClose,
}) {
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    setCurrentIdx(0);
  }, [highlight, isOpen]);

  if (!isOpen || !highlight) return null;

  const slides = highlight.stories || [
    { id: "s1", url: highlight.image, time: "Recent" },
  ];

  const handleNext = () => {
    if (currentIdx < slides.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[420px] h-[85vh] max-h-[720px] rounded-[28px] overflow-hidden bg-black shadow-2xl flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bars */}
        <div className="absolute top-3 inset-x-3 z-30 flex gap-1">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden"
            >
              <div
                className={`h-full bg-white transition-all duration-300 ${
                  idx <= currentIdx ? "w-full" : "w-0"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Top Header */}
        <div className="absolute top-6 inset-x-4 z-30 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <img
              src={highlight.image}
              alt={highlight.title}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-white/60"
            />
            <span className="text-[13px] font-bold drop-shadow">
              {highlight.title}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/70 transition"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Slide Image */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <img
            src={slides[currentIdx]?.url || highlight.image}
            alt={highlight.title}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Navigation Touch Areas */}
        <button
          type="button"
          onClick={handlePrev}
          className="absolute left-0 inset-y-0 w-1/3 z-20 opacity-0 cursor-default"
        />
        <button
          type="button"
          onClick={handleNext}
          className="absolute right-0 inset-y-0 w-2/3 z-20 opacity-0 cursor-default"
        />
      </div>
    </div>
  );
}
