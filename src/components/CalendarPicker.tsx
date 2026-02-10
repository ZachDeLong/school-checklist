import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { toLocalDateString } from '../utils/dateUtils'
import './CalendarPicker.css'

interface CalendarPickerProps {
  value: string
  onChange: (date: string) => void
  onClose: () => void
  triggerRef?: React.RefObject<HTMLElement | null>
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export default function CalendarPicker({ value, onChange, onClose, triggerRef }: CalendarPickerProps) {
  const today = new Date()
  const todayStr = toLocalDateString(today)

  const initial = value ? new Date(value + 'T00:00:00') : today
  const [viewMonth, setViewMonth] = useState(initial.getMonth())
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          !(triggerRef?.current && triggerRef.current.contains(e.target as Node))) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose, triggerRef])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  function handleDayClick(day: number) {
    const date = new Date(viewYear, viewMonth, day)
    onChange(toLocalDateString(date))
    onClose()
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)
  const monthName = new Date(viewYear, viewMonth).toLocaleString('en-US', { month: 'long' })

  // Build 6-row grid
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length < 42) cells.push(null)

  return (
    <motion.div
      className="calendar-dropdown"
      ref={ref}
      initial={{ opacity: 0, y: -4, scaleY: 0.95 }}
      animate={{ opacity: 1, y: 0, scaleY: 1 }}
      exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="calendar-header">
        <button type="button" className="calendar-nav" onClick={prevMonth} aria-label="Previous month">
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className="calendar-month-label">{monthName} {viewYear}</span>
        <button type="button" className="calendar-nav" onClick={nextMonth} aria-label="Next month">
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      <div className="calendar-weekdays">
        {WEEKDAYS.map(d => <span key={d} className="calendar-weekday">{d}</span>)}
      </div>
      <div className="calendar-grid">
        {cells.map((day, i) => {
          if (day === null) {
            return <span key={`empty-${i}`} className="calendar-day empty" />
          }
          const dateStr = toLocalDateString(new Date(viewYear, viewMonth, day))
          const isSelected = dateStr === value
          const isToday = dateStr === todayStr
          const isPast = dateStr < todayStr
          return (
            <button
              key={dateStr}
              type="button"
              className={`calendar-day${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}${isPast ? ' past' : ''}`}
              onClick={() => handleDayClick(day)}
            >
              {day}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}
