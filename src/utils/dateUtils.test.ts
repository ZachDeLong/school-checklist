import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatDueDate,
  getDueStatus,
  formatDisplayDate,
  toLocalDateString,
} from './dateUtils'

describe('dateUtils', () => {
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
