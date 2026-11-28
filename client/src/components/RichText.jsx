import React from "react";
import { Link } from "react-router-dom";

const TOKEN_REGEX = /(@[a-zA-Z0-9_.]{2,30}|#[a-zA-Z0-9_]{1,50})/g;

export default function RichText({ text = "", className = "" }) {
  if (!text) return null;
  const parts = String(text).split(TOKEN_REGEX);

  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (part.startsWith("@") && part.length > 2) {
          const username = part.slice(1);
          return (
            <Link
              key={idx}
              to={`/u/${encodeURIComponent(username)}`}
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-[#1863dc] hover:underline"
            >
              {part}
            </Link>
          );
        }
        if (part.startsWith("#") && part.length > 1) {
          const tag = part.slice(1);
          return (
            <Link
              key={idx}
              to={`/explore?q=${encodeURIComponent("#" + tag)}`}
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-[#1863dc] hover:underline"
            >
              {part}
            </Link>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </span>
  );
}
