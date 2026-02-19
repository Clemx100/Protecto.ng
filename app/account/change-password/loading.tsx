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
      <main className="flex-1 p-4 overflow-y-auto pb-20">
        <div className="space-y-6">
          {/* Form Fields Skeleton */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-3">
              <div className="h-4 w-32 bg-gray-700 rounded animate-pulse" />
              <div className="h-12 bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
          {/* Submit Button Skeleton */}
          <div className="h-12 bg-gray-800 rounded-lg animate-pulse" />
        </div>
      </main>
    </div>
  )
}

