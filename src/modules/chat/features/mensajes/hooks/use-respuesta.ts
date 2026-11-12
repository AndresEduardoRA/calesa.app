'use client'

import { useEffect, useRef, useState } from 'react'
import type { Mensaje } from '../../../entities/mensajes'

// El mensaje al que se está respondiendo: su cita va sobre el redactor y el foco pasa al campo.
export function useRespuesta() {
  const [respondiendoA, setRespondiendoA] = useState<Mensaje | null>(null)
  const campo = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (respondiendoA !== null) {
      campo.current?.focus()
    }
  }, [respondiendoA])
  return { respondiendoA, setRespondiendoA, campo }
}
