'use client'

import { icons, type LucideIcon } from 'lucide-react'

interface CategoryIconProps {
  iconName: string
  className?: string
  size?: number
}

export function CategoryIcon({ iconName, className = 'w-3.5 h-3.5', size }: CategoryIconProps) {
  const Icon: LucideIcon | undefined = icons[iconName as keyof typeof icons]

  if (!Icon) return null

  return <Icon className={className} size={size} />
}
