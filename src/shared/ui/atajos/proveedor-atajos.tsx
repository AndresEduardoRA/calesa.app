'use client'

// Registro de atajos globales. Un solo listener en `window`; cada pantalla o panel registra qué
// hace con un atajo mientras está montado. Si varios registran el mismo, responde el último (el
// panel de más arriba): así `Esc` cierra de a uno. Un atajo sin nadie registrado no hace nada y
// el navegador sigue con lo suyo.
import { createContext, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { atajoDe, valeMientrasSeEscribe, type ClaveAtajo } from '@/shared/lib/atajos'

type Manejador = () => void
type Registrar = (clave: ClaveAtajo, manejador: Manejador) => () => void

export const ContextoAtajos = createContext<Registrar | null>(null)

function estaEscribiendo(destino: EventTarget | null): boolean {
  if (!(destino instanceof HTMLElement)) {
    return false
  }
  return (
    destino.isContentEditable ||
    destino instanceof HTMLInputElement ||
    destino instanceof HTMLTextAreaElement ||
    destino instanceof HTMLSelectElement
  )
}

export function ProveedorAtajos({ children }: { children: ReactNode }) {
  const pilas = useRef(new Map<ClaveAtajo, Manejador[]>())

  useEffect(() => {
    function alPulsar(evento: KeyboardEvent) {
      const clave = atajoDe(evento)
      if (!clave || (!valeMientrasSeEscribe(clave) && estaEscribiendo(evento.target))) {
        return
      }
      const manejador = pilas.current.get(clave)?.at(-1)
      if (manejador) {
        evento.preventDefault()
        manejador()
      }
    }
    window.addEventListener('keydown', alPulsar)
    return () => {
      window.removeEventListener('keydown', alPulsar)
    }
  }, [])

  const registrar = useCallback<Registrar>((clave, manejador) => {
    const pila = pilas.current.get(clave) ?? []
    pila.push(manejador)
    pilas.current.set(clave, pila)
    return () => {
      const actual = pilas.current.get(clave) ?? []
      pilas.current.set(
        clave,
        actual.filter((otro) => otro !== manejador),
      )
    }
  }, [])

  const valor = useMemo(() => registrar, [registrar])
  return <ContextoAtajos value={valor}>{children}</ContextoAtajos>
}
