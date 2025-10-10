'use client'

import React, { useState, useEffect } from 'react'
import { Download, X, Share, Home, ArrowRight } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSModal, setShowIOSModal] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  useEffect(() => {
    // Detect iOS Safari
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(iOS)

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isInApp = (window.navigator as any).standalone === true
    setIsInstalled(isStandalone || isInApp)

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowInstallBanner(false)
      setDeferredPrompt(null)
    })

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration)
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error)
        })
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = () => {
    if (isIOS) {
      setShowIOSModal(true)
    } else if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt')
        } else {
          console.log('User dismissed the install prompt')
        }
        setDeferredPrompt(null)
        setShowInstallBanner(false)
      })
    }
  }

  const closeIOSModal = () => {
    setShowIOSModal(false)
  }

  // Don't show anything if already installed
  if (isInstalled) {
    return null
  }

  return (
    <>
      {/* Install Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg md:left-auto md:right-4 md:w-96">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm">Install Protector.Ng</p>
                <p className="text-xs text-blue-100">Add to your home screen for quick access</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleInstallClick}
                className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
              >
                Install
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="text-blue-100 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Install Protector.Ng</h3>
              <button
                onClick={closeIOSModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Share className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-gray-600 text-sm">
                  To install Protector.Ng on your iPhone or iPad:
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      Tap the <strong>Share</strong> button at the bottom of your Safari browser
                    </p>
                    <div className="mt-1 flex items-center text-xs text-gray-500">
                      <Share className="w-3 h-3 mr-1" />
                      It looks like a square with an arrow pointing up
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      Scroll down and tap <strong>"Add to Home Screen"</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      Tap <strong>"Add"</strong> to confirm
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Home className="w-4 h-4 text-blue-600" />
                  <p className="text-xs text-blue-700">
                    The app will appear on your home screen like a native app
                  </p>
                </div>
              </div>

              <button
                onClick={closeIOSModal}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Got it!</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
