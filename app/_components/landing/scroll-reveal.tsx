'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/ui/utils'

export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = 'up',
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const translate = {
    up: visible ? 'translate-y-0' : 'translate-y-10',
    down: visible ? 'translate-y-0' : '-translate-y-10',
    left: visible ? 'translate-x-0' : 'translate-x-10',
    right: visible ? 'translate-x-0' : '-translate-x-10',
    none: '',
  }[direction]

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        visible ? 'opacity-100' : 'opacity-0',
        translate,
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
