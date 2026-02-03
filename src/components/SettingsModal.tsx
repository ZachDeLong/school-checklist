import { useState, useEffect } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import './SettingsModal.css'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { canvasToken, canvasUrl, setCanvasToken, setCanvasUrl } = useSettingsStore()
  const [token, setToken] = useState(canvasToken)
  const [url, setUrl] = useState(canvasUrl)

  useEffect(() => {
    if (isOpen) {
      setToken(canvasToken)
      setUrl(canvasUrl)
    }
  }, [isOpen, canvasToken, canvasUrl])

  if (!isOpen) return null

  const handleSave = () => {
    setCanvasToken(token)
    setCanvasUrl(url)
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="settings-backdrop" onClick={handleBackdropClick}>
      <div className="settings-modal">
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button className="settings-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3 className="settings-section-title">Canvas Integration</h3>
            <p className="settings-section-desc">
              Connect to your school's Canvas LMS to sync assignments automatically.
            </p>
          </div>

          <div className="settings-field">
            <label htmlFor="canvas-url" className="settings-label">Canvas URL</label>
            <input
              id="canvas-url"
              type="text"
              className="settings-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="myschool.instructure.com"
            />
            <p className="settings-hint">Your school's Canvas domain (e.g., myschool.instructure.com)</p>
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
        </div>

        <div className="settings-footer">
          <button className="settings-btn settings-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="settings-btn settings-btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
