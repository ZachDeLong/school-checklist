import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useSettingsStore, type CanvasInstance } from '../store/settingsStore'
import './SettingsModal.css'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { canvasInstances, addCanvasInstance, updateCanvasInstance, removeCanvasInstance, timeframeDays, setTimeframeDays, soundEnabled, setSoundEnabled, confettiEnabled, setConfettiEnabled } = useSettingsStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Form state for add/edit
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')

  const resetForm = () => {
    setName('')
    setUrl('')
    setToken('')
    setEditingId(null)
    setIsAdding(false)
  }

  const handleAdd = () => {
    setIsAdding(true)
    setEditingId(null)
    setName('')
    setUrl('')
    setToken('')
  }

  const handleEdit = (instance: CanvasInstance) => {
    setEditingId(instance.id)
    setIsAdding(false)
    setName(instance.name)
    setUrl(instance.url)
    setToken(instance.token)
  }

  const handleSave = () => {
    if (!name.trim() || !url.trim() || !token.trim()) return

    if (isAdding) {
      addCanvasInstance(name, url, token)
    } else if (editingId) {
      updateCanvasInstance(editingId, { name, url, token })
    }
    resetForm()
  }

  const handleDelete = (id: string) => {
    removeCanvasInstance(id)
    if (editingId === id) {
      resetForm()
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
    <motion.div
      className="settings-backdrop"
      onMouseDown={handleBackdropClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="settings-modal"
        onMouseDown={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button className="settings-close" onClick={handleClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3 className="settings-section-title">Canvas Instances</h3>
            <p className="settings-section-desc">
              Add your schools to sync assignments from multiple Canvas instances.
            </p>
          </div>

          {/* List of configured instances */}
          <AnimatePresence mode="wait">
          {canvasInstances.length > 0 && !isAdding && !editingId && (
            <motion.div
              className="instances-list"
              key="instances-list"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {canvasInstances.map((instance) => (
                <div key={instance.id} className="instance-item">
                  <div className="instance-info">
                    <span className="instance-name">{instance.name}</span>
                    <span className="instance-url">{instance.url}</span>
                  </div>
                  <div className="instance-actions">
                    <button
                      className="instance-btn"
                      onClick={() => handleEdit(instance)}
                      aria-label="Edit"
                    >
                      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      className="instance-btn instance-btn-danger"
                      onClick={() => handleDelete(instance.id)}
                      aria-label="Delete"
                    >
                      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Add/Edit form */}
          {(isAdding || editingId) && (
            <motion.div
              className="instance-form"
              key="instance-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="settings-field">
                <label htmlFor="instance-name" className="settings-label">School Name</label>
                <input
                  id="instance-name"
                  type="text"
                  className="settings-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., IVC, Saddleback"
                />
              </div>

              <div className="settings-field">
                <label htmlFor="canvas-url" className="settings-label">Canvas URL</label>
                <input
                  id="canvas-url"
                  type="text"
                  className="settings-input"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g., ivc-new.instructure.com"
                />
                <p className="settings-hint">Your school's Canvas domain</p>
              </div>

              <div className="settings-field">
                <label htmlFor="canvas-token" className="settings-label">API Token</label>
                <input
                  id="canvas-token"
                  type="password"
                  className="settings-input"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter your Canvas API token"
                />
                <p className="settings-hint">
                  Get this from Canvas: Account → Settings → New Access Token
                </p>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-ghost" onClick={resetForm}>Cancel</button>
                <button type="button" className="btn-primary" disabled={!name.trim() || !url.trim() || !token.trim()} onClick={handleSave}>
                  {isAdding ? 'Add School' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Add button */}
          {!isAdding && !editingId && (
            <button type="button" className="btn-outline" onClick={handleAdd}>
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Add School
            </button>
          )}

          <hr className="settings-divider" />

          <div className="settings-section">
            <h3 className="settings-section-title">Display</h3>
          </div>

          <div className="settings-field">
            <label htmlFor="timeframe-days" className="settings-label">Upcoming timeframe</label>
            <div className="timeframe-input-row">
              <input
                id="timeframe-days"
                type="number"
                className="settings-input timeframe-input"
                min={1}
                max={120}
                value={timeframeDays}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(120, Number(e.target.value) || 1))
                  setTimeframeDays(v)
                }}
              />
              <span className="timeframe-suffix">days</span>
            </div>
            <p className="settings-hint">Tasks due within this many days appear in the highlighted section (1–120)</p>
          </div>

          <div className="settings-toggle-row">
            <label className="settings-label" htmlFor="toggle-sound">Sound effects</label>
            <button
              id="toggle-sound"
              role="switch"
              aria-checked={soundEnabled}
              className={`toggle-switch ${soundEnabled ? 'active' : ''}`}
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              <span className="toggle-slider" />
            </button>
          </div>

          <div className="settings-toggle-row">
            <label className="settings-label" htmlFor="toggle-confetti">Confetti</label>
            <button
              id="toggle-confetti"
              role="switch"
              aria-checked={confettiEnabled}
              className={`toggle-switch ${confettiEnabled ? 'active' : ''}`}
              onClick={() => setConfettiEnabled(!confettiEnabled)}
            >
              <span className="toggle-slider" />
            </button>
          </div>
        </div>

        <div className="settings-footer">
          <button type="button" className="btn-ghost" onClick={handleClose}>Done</button>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  )
}
