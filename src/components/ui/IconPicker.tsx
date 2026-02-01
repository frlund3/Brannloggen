'use client'

import { useState } from 'react'
import { icons, type LucideIcon } from 'lucide-react'

// Curated list of relevant icons for emergency/fire service categories
const ICON_GROUPS: { label: string; icons: string[] }[] = [
  {
    label: 'Brann & Nød',
    icons: [
      'Flame', 'FireExtinguisher', 'Siren', 'AlertTriangle', 'AlertCircle',
      'Bell', 'BellRing', 'ShieldAlert', 'Zap', 'Bomb',
      'TriangleAlert', 'OctagonAlert', 'CircleAlert',
    ],
  },
  {
    label: 'Kjøretøy & Transport',
    icons: [
      'Car', 'Truck', 'Bus', 'Train', 'Tram', 'Ship', 'Sailboat',
      'Plane', 'PlaneTakeoff', 'Bike', 'Ambulance',
    ],
  },
  {
    label: 'Bygning & Sted',
    icons: [
      'Building', 'Building2', 'Home', 'Hotel', 'Factory', 'Warehouse',
      'Church', 'School', 'Hospital', 'Landmark', 'Store',
      'Mountain', 'Trees', 'TreePine', 'MapPin',
    ],
  },
  {
    label: 'Vann & Natur',
    icons: [
      'Waves', 'Droplets', 'Droplet', 'CloudRain', 'CloudLightning',
      'Snowflake', 'Wind', 'Tornado', 'Thermometer', 'Sun',
    ],
  },
  {
    label: 'Mennesker & Helse',
    icons: [
      'User', 'Users', 'Heart', 'HeartPulse', 'Activity',
      'Stethoscope', 'Pill', 'Cross', 'CirclePlus', 'Baby',
      'PersonStanding', 'Accessibility',
    ],
  },
  {
    label: 'Verktøy & Utstyr',
    icons: [
      'Wrench', 'Hammer', 'HardHat', 'Shield', 'ShieldCheck',
      'Lock', 'Key', 'Radio', 'Phone', 'Megaphone',
      'Flashlight', 'Compass', 'Search', 'Eye',
    ],
  },
  {
    label: 'Diverse',
    icons: [
      'Package', 'Box', 'Container', 'Skull', 'Biohazard', 'Radiation',
      'Construction', 'Fence', 'CircleDot', 'Star',
      'Info', 'HelpCircle', 'FileWarning', 'Flag',
      'Dog', 'Cat', 'Bug', 'Bird',
    ],
  },
]

interface IconPickerProps {
  value: string
  onChange: (iconName: string) => void
  color?: string
}

export function IconPicker({ value, onChange, color = '#fff' }: IconPickerProps) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(true)

  const SelectedIcon = value ? icons[value as keyof typeof icons] : null

  const filteredGroups = search
    ? ICON_GROUPS.map(g => ({
        ...g,
        icons: g.icons.filter(name =>
          name.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(g => g.icons.length > 0)
    : ICON_GROUPS

  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">Ikon</label>

      {/* Current selection preview */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm hover:border-[#3a3a3a] transition-colors"
      >
        {SelectedIcon ? (
          <SelectedIcon className="w-5 h-5" style={{ color }} />
        ) : (
          <span className="w-5 h-5 rounded bg-[#2a2a2a]" />
        )}
        <span className="flex-1 text-left">{value || 'Velg ikon...'}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Icon grid */}
      {expanded && (
        <div className="mt-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 max-h-64 overflow-y-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk ikon..."
            className="w-full px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-white text-xs focus:outline-none focus:border-blue-500 mb-3"
          />

          {filteredGroups.map((group) => (
            <div key={group.label} className="mb-3 last:mb-0">
              <p className="text-xs text-gray-500 mb-1.5">{group.label}</p>
              <div className="grid grid-cols-8 gap-1">
                {group.icons.map((name) => {
                  const Icon: LucideIcon | undefined = icons[name as keyof typeof icons]
                  if (!Icon) return null
                  const isSelected = value === name
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => { onChange(name); setExpanded(false); setSearch('') }}
                      title={name}
                      className={`p-1.5 rounded flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-blue-500/20 ring-1 ring-blue-500'
                          : 'hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <Icon className="w-4 h-4" style={{ color: isSelected ? color : '#9ca3af' }} />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {filteredGroups.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-2">Ingen ikoner funnet</p>
          )}
        </div>
      )}
    </div>
  )
}
