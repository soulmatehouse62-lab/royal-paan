export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading analytics">
      <div className="skeleton mb-2 h-9 w-40" />
      <div className="skeleton mb-5 h-4 w-28" />
      <div className="mb-4 flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-10 w-24 rounded-full" />
        ))}
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-20" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card h-72 p-4">
            <div className="skeleton mb-4 h-5 w-40" />
            <div className="skeleton h-52 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
