export default function Loading() {
  return (
    <div className="w-full max-w-md mx-auto bg-black min-h-screen flex flex-col text-white">
      {/* Header Skeleton */}
      <div className="bg-black border-b border-gray-800 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-5 w-36 bg-gray-800 rounded animate-pulse" />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {/* Introduction Skeleton */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-3">
          <div className="h-6 w-48 bg-gray-700 rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-700 rounded animate-pulse" />
          </div>
        </div>

        {/* Sections Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="h-14 bg-gray-700 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-full bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-full bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
