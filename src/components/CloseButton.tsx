import type { ButtonHTMLAttributes } from "react";

export function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`close-icon ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CloseButton({
  label = "Close",
  className = "",
  ...props
}: {
  label?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type" | "aria-label">) {
  return (
    <button type="button" className={`btn-close ${className}`.trim()} aria-label={label} {...props}>
      <CloseIcon />
    </button>
  );
}
