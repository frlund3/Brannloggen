'use client'

interface ToggleSwitchProps {
  enabled: boolean
  onChange: () => void
  disabled?: boolean
  label: string
  description?: string
}

export function ToggleSwitch({ enabled, onChange, disabled, label, description }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm text-theme">{label}</span>
        {description && <p className="text-xs text-theme-muted mt-0.5">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        disabled={disabled}
        onClick={onChange}
        className={`w-12 h-6 rounded-full transition-colors relative ${
          enabled ? 'bg-blue-500' : 'bg-theme-card-hover'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}
