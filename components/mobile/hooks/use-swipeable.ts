"use client"

import { useCallback, useRef, useState } from "react"

export interface SwipeAction {
  label: string
  icon?: React.ElementType
  action: () => void
  variant?: "default" | "destructive" | "success" | "warning"
}

interface UseSwipeableOptions {
  /** Action to reveal on swipe left */
  actions?: SwipeAction[]
  /** Threshold in px before action triggers (default: 80) */
  threshold?: number
  /** Disable swiping */
  disabled?: boolean
}

interface UseSwipeableReturn {
  /** Bind these to the swipeable element */
  bind: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
  /** Current translateX offset in px */
  translateX: number
  /** Whether an action is fully revealed */
  isOpen: boolean
  /** Programmatically close the swipe actions */
  close: () => void
}

/**
 * Swipeable row hook for mobile swipe-to-reveal actions.
 *
 * Usage:
 *   const { bind, translateX } = useSwipeable({ actions: [...], threshold: 80 })
 *   return <div {...bind} style={{ transform: `translateX(${translateX}px)` }}>...</div>
 */
export function useSwipeable({
  actions = [],
  threshold = 80,
  disabled = false,
}: UseSwipeableOptions): UseSwipeableReturn {
  const [translateX, setTranslateX] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const startX = useRef(0)
  const currentX = useRef(0)
  const swiping = useRef(false)

  const maxSwipe = actions.length > 0 ? -(actions.length * 72) : 0

  const close = useCallback(() => {
    setTranslateX(0)
    setIsOpen(false)
  }, [])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return
      startX.current = e.touches[0].clientX
      currentX.current = translateX
      swiping.current = true
    },
    [disabled, translateX],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || !swiping.current || maxSwipe === 0) return
      const diff = e.touches[0].clientX - startX.current
      // Only allow swipe left (negative)
      if (diff > 0 && currentX.current >= 0) {
        setTranslateX(0)
        return
      }
      const newX = Math.max(maxSwipe, Math.min(0, currentX.current + diff * 0.5))
      setTranslateX(newX)
    },
    [disabled, maxSwipe],
  )

  const handleTouchEnd = useCallback(() => {
    if (disabled || !swiping.current) return
    swiping.current = false
    if (translateX < -threshold) {
      setTranslateX(maxSwipe)
      setIsOpen(true)
    } else {
      setTranslateX(0)
      setIsOpen(false)
    }
  }, [disabled, translateX, threshold, maxSwipe])

  return {
    bind: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    translateX,
    isOpen,
    close,
  }
}
