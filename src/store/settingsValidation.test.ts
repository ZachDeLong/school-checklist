import { describe, expect, it } from 'vitest'
import { sanitizePersistedSettings } from './settingsValidation'

describe('sanitizePersistedSettings', () => {
  it('preserves valid persisted settings', () => {
    const settings = sanitizePersistedSettings({
      theme: 'light',
      timeframeDays: 30,
      soundEnabled: false,
      confettiEnabled: true,
      setupPromptDismissed: true,
      minimalMode: false,
      canvasInstances: [
        { id: 'school-1', name: 'IVC', url: 'ivc.instructure.com', token: 'secret' },
      ],
    })

    expect(settings).toEqual({
      theme: 'light',
      timeframeDays: 30,
      soundEnabled: false,
      confettiEnabled: true,
      setupPromptDismissed: true,
      minimalMode: false,
      canvasInstances: [
        { id: 'school-1', name: 'IVC', url: 'ivc.instructure.com', token: 'secret' },
      ],
    })
  })

  it('drops invalid fields without losing unrelated valid preferences', () => {
    expect(sanitizePersistedSettings({
      theme: 'sepia',
      timeframeDays: 0,
      soundEnabled: false,
      confettiEnabled: 'yes',
      canvasInstances: { id: 'not-an-array' },
    })).toEqual({ soundEnabled: false })
  })

  it('salvages valid Canvas instances and removes duplicate IDs', () => {
    expect(sanitizePersistedSettings({
      canvasInstances: [
        { id: 'school-1', name: 'IVC', url: 'ivc.instructure.com', token: 'first' },
        { id: 'school-1', name: 'Duplicate', url: 'duplicate.instructure.com', token: 'second' },
        { id: '', name: 'Missing ID', url: 'bad.instructure.com', token: 'third' },
        null,
      ],
    }).canvasInstances).toEqual([
      { id: 'school-1', name: 'IVC', url: 'ivc.instructure.com', token: 'first' },
    ])
  })

  it('rejects non-object persisted state', () => {
    expect(sanitizePersistedSettings(null)).toEqual({})
    expect(sanitizePersistedSettings([])).toEqual({})
    expect(sanitizePersistedSettings('broken')).toEqual({})
  })
})
