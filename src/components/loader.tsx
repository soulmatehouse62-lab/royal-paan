export function Loader({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`${sizeMap[size]} relative`}>
        {/* Outer circular border */}
        <svg
          className="absolute inset-0 animate-spin"
          style={{ animationDuration: "3s" }}
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Dashed circle border matching logo */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#c7922f"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.6"
          />
          {/* Inner solid circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#c7922f"
            strokeWidth="1"
            opacity="0.3"
          />
        </svg>

        {/* Center crown/decorative element */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-2/3 h-2/3">
            {/* Spinning crown icon representation */}
            <svg
              className="absolute inset-0 animate-pulse"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#c7922f"
                d="M12 2 L15 8 L21 8 L17 12 L19 18 L12 14 L5 18 L7 12 L3 8 L9 8 Z"
                opacity="0.8"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-cream">
      <div className="text-center">
        <Loader size="lg" />
        <p className="mt-4 text-sm font-medium text-muted">Loading...</p>
      </div>
    </div>
  );
}

export function InlineLoader() {
  return (
    <div className="inline-flex items-center gap-2">
      <Loader size="sm" />
      <span className="text-sm text-muted">Loading...</span>
    </div>
  );
}
