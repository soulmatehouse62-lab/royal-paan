export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading history">
      <div className="skeleton mb-2 h-9 w-36" />
      <div className="skeleton mb-5 h-4 w-24" />
      <div className="card mb-4 grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={`skeleton h-12 ${i < 2 ? "col-span-2" : ""}`} />
        ))}
      </div>
      <div className="card divide-y divide-line">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-5 w-28" />
              <div className="skeleton h-4 w-44" />
            </div>
            <div className="skeleton h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
