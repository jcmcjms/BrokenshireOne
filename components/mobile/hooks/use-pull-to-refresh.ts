"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  /** Threshold in px before refresh triggers (default: 60) */
  threshold?: number
  /** Container selector to attach events to (default: uses window scroll) */
  containerRef?: React.RefObject<HTMLElement | null>
}

interface UsePullToRefreshReturn {
  /** Whether a refresh is currently in progress */
  refreshing: boolean
  /** Current pull distance in px (0 when idle) */
  pullDistance: number
}

/**
 * Pull-to-refresh hook.
 * Attaches touch events to detect pull-down gesture past a threshold.
 * Shows a spinner while the refresh function runs.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 60,
  containerRef,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const pulling = useRef(false)
  const pullDistanceRef = useRef(0)

  const handleTouchStart = useCallback((e: Event) => {
    const touchEvent = e as TouchEvent
    const scrollY = containerRef?.current
      ? containerRef.current.scrollTop
      : window.scrollY
    if (scrollY > 0) return
    startY.current = touchEvent.touches[0].clientY
    pulling.current = true
  }, [containerRef])

  const handleTouchMove = useCallback((e: Event) => {
    const touchEvent = e as TouchEvent
    if (!pulling.current) return
    const currentY = touchEvent.touches[0].clientY
    const diff = currentY - startY.current
    if (diff < 0) {
      setPullDistance(0)
      pullDistanceRef.current = 0
      return
    }
    // Resistive factor: real pull = sqrt(diff) * 3 for natural feel
    const distance = Math.min(Math.sqrt(diff) * 3, 120)
    pullDistanceRef.current = distance
    setPullDistance(distance)
  }, [])

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return
    pulling.current = false
    const distance = pullDistanceRef.current
    if (distance >= threshold) {
      setRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPullDistance(0)
        pullDistanceRef.current = 0
      }
    } else {
      setPullDistance(0)
      pullDistanceRef.current = 0
    }
  }, [threshold, onRefresh])

  useEffect(() => {
    const el = containerRef?.current ?? document
    el.addEventListener("touchstart", handleTouchStart, { passive: true })
    el.addEventListener("touchmove", handleTouchMove, { passive: true })
    el.addEventListener("touchend", handleTouchEnd, { passive: true })
    return () => {
      el.removeEventListener("touchstart", handleTouchStart)
      el.removeEventListener("touchmove", handleTouchMove)
      el.removeEventListener("touchend", handleTouchEnd)
    }
  }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd])

  return { refreshing, pullDistance }
}
