'use client'

// Densidad de filas: compacta en escritorio, cómoda en táctil; conmutable y recordada por
// persona. El valor efectivo llega al CSS como `data-densidad` en <html> (ahí lo ven también los
// paneles que se montan en un portal) y de él sale `--fila` (src/app/globals.css).
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

export type Densidad = 'compacta' | 'comoda'

type Valor = {
  // Lo que se está aplicando.
  densidad: Densidad
  // Lo que la persona eligió; `null` = automática, según el dispositivo.
  preferencia: Densidad | null
  cambiar: (nueva: Densidad | null) => void
}

const Contexto = createContext<Valor | null>(null)

const TACTIL = '(pointer: coarse)'

function suscribirATactil(alCambiar: () => void): () => void {
  const consulta = window.matchMedia(TACTIL)
  consulta.addEventListener('change', alCambiar)
  return () => {
    consulta.removeEventListener('change', alCambiar)
  }
}

function esTactil(): boolean {
  return window.matchMedia(TACTIL).matches
}

type Props = {
  // La preferencia guardada de la persona. La lee el layout de la app; `shared` no sabe de dónde.
  inicial: Densidad | null
  // Para guardarla. Si falla, la densidad igual queda aplicada en esta pestaña.
  alCambiar?: (nueva: Densidad | null) => void
  children: ReactNode
}

export function ProveedorDensidad({ inicial, alCambiar, children }: Props) {
  const [preferencia, setPreferencia] = useState(inicial)
  // En el servidor no se conoce el dispositivo: se asume escritorio y el CSS corrige con su
  // propia media query mientras tanto.
  const tactil = useSyncExternalStore(suscribirATactil, esTactil, () => false)
  const densidad: Densidad = preferencia ?? (tactil ? 'comoda' : 'compacta')

  useEffect(() => {
    const raiz = document.documentElement
    if (preferencia) {
      raiz.dataset['densidad'] = preferencia
    } else {
      delete raiz.dataset['densidad']
    }
  }, [preferencia])

  const cambiar = useCallback(
    (nueva: Densidad | null) => {
      setPreferencia(nueva)
      alCambiar?.(nueva)
    },
    [alCambiar],
  )

  const valor = useMemo(
    () => ({ densidad, preferencia, cambiar }),
    [densidad, preferencia, cambiar],
  )
  return <Contexto value={valor}>{children}</Contexto>
}

export function useDensidad(): Valor {
  const valor = use(Contexto)
  if (!valor) {
    throw new Error('useDensidad() se usa dentro de <ProveedorDensidad>.')
  }
  return valor
}
