export default function Loading() {
  return (
    <div className="w-full max-w-md mx-auto bg-black min-h-screen flex flex-col text-white">
      {/* Header Skeleton */}
      <div className="bg-black border-b border-gray-800 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-5 w-40 bg-gray-800 rounded animate-pulse" />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {/* Contact Methods Skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-48 bg-gray-800 rounded animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-800 rounded-lg border border-gray-700 animate-pulse" />
            ))}
          </div>
        </div>

        {/* Emergency Contact Skeleton */}
        <div className="h-32 bg-gray-800 rounded-lg border border-gray-700 animate-pulse" />

        {/* Form Skeleton */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4">
          <div className="h-6 w-32 bg-gray-700 rounded animate-pulse" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
                <div className="h-12 bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-12 bg-gray-700 rounded animate-pulse" />
        </div>
      </main>
    </div>
  )
}
