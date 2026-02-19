"use client"

/**
 * Mature loading screen: Protector.Ng logo with a subtle breathing animation
 * and a thin rotating ring. Used as Suspense fallback and brand-consistent loader.
 */
export default function LoadingLogo() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="relative flex items-center justify-center">
        {/* Thin rotating ring */}
        <div
          className="absolute w-24 h-24 rounded-full border-2 border-transparent border-t-blue-500/90 border-r-blue-400/50 animate-loading-ring"
          aria-hidden
        />
        {/* Logo with subtle breath */}
        <div className="relative w-16 h-16 flex items-center justify-center animate-loading-breath">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/PRADO/slideshow/logo.PNG"
            alt="Protector.Ng"
            className="w-full h-full object-contain"
          />
        </div>
      </div>
      <p className="mt-6 text-sm font-medium text-gray-400 animate-loading-text tracking-widest uppercase">
        Loading
      </p>
    </div>
  )
}
