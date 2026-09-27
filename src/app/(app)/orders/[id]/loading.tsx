export default function Loading() {
  return (
    <div className="mx-auto max-w-md space-y-4" aria-busy="true" aria-label="Loading bill">
      <div className="flex justify-between">
        <div className="skeleton h-5 w-20" />
        <div className="skeleton h-10 w-28" />
      </div>
      <div className="card space-y-4 px-5 py-6">
        <div className="mx-auto skeleton h-6 w-56" />
        <div className="mx-auto skeleton h-3 w-64" />
        <div className="skeleton h-12 w-full" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex justify-between">
            <div className="skeleton h-4 w-40" />
            <div className="skeleton h-4 w-14" />
          </div>
        ))}
        <div className="skeleton h-8 w-full" />
      </div>
      <div className="skeleton h-14 w-full" />
    </div>
  );
}
