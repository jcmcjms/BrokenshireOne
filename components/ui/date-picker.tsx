"use client"

import { cn } from "@/lib/utils"
import { CalendarBlankIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react"

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  className?: string
}

export function DatePicker({ value, onChange, className }: DatePickerProps) {
  const today = new Date().toISOString().split("T")[0]

  const handlePrevDay = () => {
    const d = new Date(value || today)
    d.setDate(d.getDate() - 1)
    onChange(d.toISOString().split("T")[0])
  }

  const handleNextDay = () => {
    const d = new Date(value || today)
    d.setDate(d.getDate() + 1)
    const nextStr = d.toISOString().split("T")[0]
    if (nextStr <= today) {
      onChange(nextStr)
    }
  }

  const displayDate = value || today
  const formatted = new Date(displayDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const isToday = displayDate === today

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={handlePrevDay}
        className="flex items-center justify-center size-7 rounded-md border border-border hover:bg-accent transition-colors"
        aria-label="Previous day"
      >
        <CaretLeftIcon className="size-3" />
      </button>

      <label className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border hover:bg-accent transition-colors cursor-pointer min-w-[140px]">
        <CalendarBlankIcon className="size-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium tabular-nums whitespace-nowrap">
          {isToday ? `Today (${formatted})` : formatted}
        </span>
        <input
          type="date"
          value={displayDate}
          max={today}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>

      <button
        type="button"
        onClick={handleNextDay}
        disabled={isToday}
        className="flex items-center justify-center size-7 rounded-md border border-border hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Next day"
      >
        <CaretRightIcon className="size-3" />
      </button>
    </div>
  )
}
