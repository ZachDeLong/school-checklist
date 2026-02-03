import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseLocalDate,
  formatDueDate,
  getDueStatus,
  isToday,
  formatDisplayDate,
  toLocalDateString,
} from './dateUtils'

describe('dateUtils', () => {
  describe('parseLocalDate', () => {
    it('parses ISO date string to local date', () => {
      const date = parseLocalDate('2025-02-15T10:00:00Z')
      expect(date.getFullYear()).toBe(2025)
      expect(date.getMonth()).toBe(1) // February (0-indexed)
      expect(date.getDate()).toBe(15)
    })

    it('parses date-only string', () => {
      const date = parseLocalDate('2025-12-25')
      expect(date.getFullYear()).toBe(2025)
      expect(date.getMonth()).toBe(11) // December
      expect(date.getDate()).toBe(25)
    })

    it('handles year boundaries', () => {
      const newYear = parseLocalDate('2026-01-01')
      expect(newYear.getFullYear()).toBe(2026)
      expect(newYear.getMonth()).toBe(0)
      expect(newYear.getDate()).toBe(1)
    })
  })

  describe('formatDueDate', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2025, 1, 15)) // Feb 15, 2025
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns null for null input', () => {
      expect(formatDueDate(null)).toBeNull()
    })

    it('returns "Today" for today\'s date', () => {
      expect(formatDueDate('2025-02-15')).toBe('Today')
    })

    it('returns "Tomorrow" for tomorrow\'s date', () => {
      expect(formatDueDate('2025-02-16')).toBe('Tomorrow')
    })

    it('returns formatted date for other dates', () => {
      const result = formatDueDate('2025-02-20')
      expect(result).toContain('Feb')
      expect(result).toContain('20')
    })
  })

  describe('getDueStatus', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2025, 1, 15)) // Feb 15, 2025
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns empty string for null', () => {
      expect(getDueStatus(null)).toBe('')
    })

    it('returns "overdue" for past dates', () => {
      expect(getDueStatus('2025-02-14')).toBe('overdue')
    })

    it('returns "due-today" for today', () => {
      expect(getDueStatus('2025-02-15')).toBe('due-today')
    })

    it('returns "due-soon" for tomorrow', () => {
      expect(getDueStatus('2025-02-16')).toBe('due-soon')
    })

    it('returns empty string for future dates beyond tomorrow', () => {
      expect(getDueStatus('2025-02-20')).toBe('')
    })
  })

  describe('isToday', () => {
    it('returns false for null', () => {
      expect(isToday(null)).toBe(false)
    })

    it('returns true for today', () => {
      const now = new Date()
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T12:00:00`
      expect(isToday(todayStr)).toBe(true)
    })

    it('returns false for yesterday', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}T12:00:00`
      expect(isToday(yesterdayStr)).toBe(false)
    })

    it('returns false for tomorrow', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}T12:00:00`
      expect(isToday(tomorrowStr)).toBe(false)
    })
  })

  describe('formatDisplayDate', () => {
    it('returns null for empty string', () => {
      expect(formatDisplayDate('')).toBeNull()
    })

    it('formats date as "Month Day"', () => {
      const result = formatDisplayDate('2025-02-15')
      expect(result).toContain('Feb')
      expect(result).toContain('15')
    })

    it('handles different months', () => {
      expect(formatDisplayDate('2025-12-25')).toContain('Dec')
      expect(formatDisplayDate('2025-01-01')).toContain('Jan')
    })
  })

  describe('toLocalDateString', () => {
    it('converts Date to YYYY-MM-DD format', () => {
      const date = new Date(2025, 1, 15) // Feb 15, 2025
      expect(toLocalDateString(date)).toBe('2025-02-15')
    })

    it('pads single-digit months and days', () => {
      const date = new Date(2025, 0, 5) // Jan 5, 2025
      expect(toLocalDateString(date)).toBe('2025-01-05')
    })

    it('handles year boundaries correctly', () => {
      const newYearsEve = new Date(2025, 11, 31)
      expect(toLocalDateString(newYearsEve)).toBe('2025-12-31')

      const newYear = new Date(2026, 0, 1)
      expect(toLocalDateString(newYear)).toBe('2026-01-01')
    })
  })
})
