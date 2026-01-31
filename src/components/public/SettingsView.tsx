'use client'

import { useState } from 'react'
import { fylker } from '@/data/fylker'
import { kategorier } from '@/data/kategorier'
import { brannvesen } from '@/data/brannvesen'

export function SettingsView() {
  const [pushEnabled, setPushEnabled] = useState(false)
  const [selectedFylker, setSelectedFylker] = useState<string[]>([])
  const [selectedKategorier, setSelectedKategorier] = useState<string[]>([])
  const [selectedBrannvesen, setSelectedBrannvesen] = useState<string[]>([])
  const [onlyOngoing, setOnlyOngoing] = useState(false)

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, id: string) => {
    setArr(arr.includes(id) ? arr.filter((v) => v !== id) : [...arr, id])
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-6">Innstillinger</h1>

      {/* Push section */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Push-varsler</h2>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm">Aktiver push-varsler</span>
            <button
              onClick={() => setPushEnabled(!pushEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                pushEnabled ? 'bg-blue-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  pushEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Kun pågående hendelser</span>
            <button
              onClick={() => setOnlyOngoing(!onlyOngoing)}
              className={`w-12 h-6 rounded-full transition-colors ${
                onlyOngoing ? 'bg-blue-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  onlyOngoing ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Fylker */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">
          Fylker
          {selectedFylker.length > 0 && (
            <span className="text-sm text-blue-400 font-normal ml-2">
              ({selectedFylker.length} valgt)
            </span>
          )}
        </h2>
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          {fylker.map((f, i) => (
            <button
              key={f.id}
              onClick={() => toggleItem(selectedFylker, setSelectedFylker, f.id)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left ${
                i < fylker.length - 1 ? 'border-b border-[#2a2a2a]' : ''
              } ${selectedFylker.includes(f.id) ? 'text-blue-400' : 'text-white'}`}
            >
              <span className="text-sm">{f.navn}</span>
              {selectedFylker.includes(f.id) && (
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Kategorier */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">
          Hendelsestyper
          {selectedKategorier.length > 0 && (
            <span className="text-sm text-blue-400 font-normal ml-2">
              ({selectedKategorier.length} valgt)
            </span>
          )}
        </h2>
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          {kategorier.map((k, i) => (
            <button
              key={k.id}
              onClick={() => toggleItem(selectedKategorier, setSelectedKategorier, k.id)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left ${
                i < kategorier.length - 1 ? 'border-b border-[#2a2a2a]' : ''
              } ${selectedKategorier.includes(k.id) ? 'text-blue-400' : 'text-white'}`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: k.farge }} />
                <span className="text-sm">{k.navn}</span>
              </div>
              {selectedKategorier.includes(k.id) && (
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Brannvesen (condensed) */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">
          Brannvesen
          {selectedBrannvesen.length > 0 && (
            <span className="text-sm text-blue-400 font-normal ml-2">
              ({selectedBrannvesen.length} valgt)
            </span>
          )}
        </h2>
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] max-h-80 overflow-y-auto">
          {brannvesen.map((b, i) => (
            <button
              key={b.id}
              onClick={() => toggleItem(selectedBrannvesen, setSelectedBrannvesen, b.id)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-left ${
                i < brannvesen.length - 1 ? 'border-b border-[#2a2a2a]' : ''
              } ${selectedBrannvesen.includes(b.id) ? 'text-blue-400' : 'text-white'}`}
            >
              <span className="text-sm">{b.kort_navn}</span>
              {selectedBrannvesen.includes(b.id) && (
                <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Links */}
      <section className="mb-24">
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <a href="/login" className="block px-4 py-3 text-sm text-white border-b border-[#2a2a2a] hover:bg-[#222]">
            Logg inn (110-sentral / Admin)
          </a>
          <a href="/operator/hendelser" className="block px-4 py-3 text-sm text-white hover:bg-[#222]">
            110-sentral dashboard
          </a>
        </div>
      </section>
    </div>
  )
}
