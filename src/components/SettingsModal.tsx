import { useState } from 'react'
import { useSettingsStore, type CanvasInstance } from '../store/settingsStore'
import './SettingsModal.css'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { canvasInstances, addCanvasInstance, updateCanvasInstance, removeCanvasInstance } = useSettingsStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Form state for add/edit
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')

  if (!isOpen) return null

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
    <div className="settings-backdrop" onMouseDown={handleBackdropClick}>
      <div className="settings-modal" onMouseDown={(e) => e.stopPropagation()}>
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
          {canvasInstances.length > 0 && !isAdding && !editingId && (
            <div className="instances-list">
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
            </div>
          )}

          {/* Add/Edit form */}
          {(isAdding || editingId) && (
            <div className="instance-form">
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
                <button
                  onClick={resetForm}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #2e2820',
                    background: '#1a1714',
                    color: '#a69f94',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'Helvetica Neue, sans-serif',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name.trim() || !url.trim() || !token.trim()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#d4a456',
                    color: '#0f0d0b',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'Helvetica Neue, sans-serif',
                    opacity: (!name.trim() || !url.trim() || !token.trim()) ? 0.5 : 1,
                  }}
                >
                  {isAdding ? 'Add School' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* Add button */}
          {!isAdding && !editingId && (
            <button className="add-instance-btn" onClick={handleAdd}>
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Add School
            </button>
          )}
        </div>

        <div className="settings-footer">
          <button
            onClick={handleClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #2e2820',
              background: '#1a1714',
              color: '#a69f94',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: 'Helvetica Neue, sans-serif',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
