export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading dues">
      <div className="skeleton mb-2 h-9 w-32" />
      <div className="skeleton mb-5 h-4 w-64" />
      <div className="skeleton mb-4 h-12 w-full" />
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card p-4">
            <div className="flex justify-between">
              <div className="space-y-2">
                <div className="skeleton h-6 w-24" />
                <div className="skeleton h-4 w-36" />
              </div>
              <div className="skeleton h-8 w-20" />
            </div>
            <div className="skeleton mt-4 h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
