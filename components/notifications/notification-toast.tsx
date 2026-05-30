"use client"

import { toast } from "sonner"
import type { Notification } from "./types"

/**
 * Play a notification sound using Web Audio API (no file needed).
 */
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880 // A5
    osc.type = "sine"
    gain.gain.value = 0.1
    osc.start()
    osc.stop(ctx.currentTime + 0.15)

    // Second chime
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.frequency.value = 1100 // C#6
    osc2.type = "sine"
    gain2.gain.value = 0.08
    osc2.start(ctx.currentTime + 0.15)
    osc2.stop(ctx.currentTime + 0.3)
  } catch {
    // Audio not available — silently skip
  }
}

/**
 * Vibrate device on notification.
 */
function vibrate() {
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate(100)
    }
  } catch {
    // Vibration not available
  }
}

/**
 * Show a toast notification + play sound + vibrate.
 */
export function showNotificationToast(n: Notification) {
  // Sound + vibration
  playNotificationSound()
  vibrate()

  // Sonner toast
  toast(n.title, {
    description: n.message,
    duration: 4000,
  })
}
