import { useEffect, useState } from 'react'

const IOS_USER_AGENT_REGEX = /iphone|ipad|ipod/i

function isStandaloneDisplayMode() {
  if (typeof window === 'undefined') {
    return false
  }

  return Boolean(
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true,
  )
}

function isIosDevice() {
  if (typeof window === 'undefined') {
    return false
  }

  return IOS_USER_AGENT_REGEX.test(window.navigator.userAgent || '')
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const [installed, setInstalled] = useState(() => isStandaloneDisplayMode())
  const isIos = isIosDevice()

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const mediaQuery = window.matchMedia?.('(display-mode: standalone)')

    function handleBeforeInstallPrompt(event) {
      event.preventDefault()
      setDeferredPrompt(event)
      setDismissed(false)
    }

    function handleAppInstalled() {
      setInstalled(true)
      setDeferredPrompt(null)
      setDismissed(false)
    }

    function handleDisplayModeChange(event) {
      const nextInstalled = Boolean(event.matches || window.navigator.standalone === true)

      setInstalled(nextInstalled)

      if (nextInstalled) {
        setDeferredPrompt(null)
        setDismissed(false)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange)
    } else if (mediaQuery?.addListener) {
      mediaQuery.addListener(handleDisplayModeChange)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)

      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange)
      } else if (mediaQuery?.removeListener) {
        mediaQuery.removeListener(handleDisplayModeChange)
      }
    }
  }, [])

  const canInstall = Boolean(deferredPrompt) && !installed && !dismissed
  const showIosInstallHint = isIos && !installed && !deferredPrompt && !dismissed

  async function promptInstall() {
    if (!deferredPrompt) {
      return false
    }

    deferredPrompt.prompt()

    const choiceResult = await deferredPrompt.userChoice

    setDeferredPrompt(null)

    if (choiceResult?.outcome === 'accepted') {
      setInstalled(true)
      return true
    }

    setDismissed(true)
    return false
  }

  function dismissInstallPrompt() {
    setDismissed(true)
  }

  return {
    canInstall,
    dismissInstallPrompt,
    installed,
    promptInstall,
    showIosInstallHint,
  }
}
