"use client";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function LoadingSpinner({ size = "md", text }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative">
        {/* Outer ring */}
        <div
          className={`${sizeMap[size]} animate-spin rounded-full border-2 border-primary-500/20`}
        />
        {/* Inner ring */}
        <div
          className={`absolute inset-0 ${sizeMap[size]} animate-spin rounded-full border-t-2 border-primary-500`}
          style={{ animationDuration: "0.8s" }}
        />
      </div>
      {text && <p className="text-sm text-gray-400">{text}</p>}
    </div>
  );
}
