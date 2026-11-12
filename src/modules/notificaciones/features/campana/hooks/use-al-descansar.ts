'use client'

import { useEffect, useState } from 'react'

// Verdadero cuando el navegador ya hidrató la pantalla y descansa (o tras `tope` ms, lo primero). La campana pide su
// contador y su canal de Realtime recién entonces: el código del cliente de Supabase pesa, y evaluarlo mientras React
// hidrata la pantalla retrasaba ≈ 300 ms el primer clic que vale.
export function useAlDescansar(tope = 3000): boolean {
  const [listo, setListo] = useState(false)
  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(
        () => {
          setListo(true)
        },
        { timeout: tope },
      )
      return () => {
        window.cancelIdleCallback(id)
      }
    }
    const id = window.setTimeout(() => {
      setListo(true)
    }, 200)
    return () => {
      window.clearTimeout(id)
    }
  }, [tope])
  return listo
}
