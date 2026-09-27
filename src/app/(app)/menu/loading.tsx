export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading menu">
      <div className="skeleton mb-2 h-9 w-28" />
      <div className="skeleton mb-5 h-4 w-40" />
      <div className="skeleton mb-4 h-12 w-full" />
      {Array.from({ length: 3 }, (_, g) => (
        <div key={g} className="mb-5">
          <div className="skeleton mb-2 h-6 w-32" />
          <div className="card divide-y divide-line">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-5 w-40" />
                  <div className="skeleton h-4 w-24" />
                </div>
                <div className="skeleton h-7 w-12 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
