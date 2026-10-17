'use client'

import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react'
import type { TamanoDePagina } from '@/shared/lib/paginacion'

// Lo que dice guardar la preferencia: o quedó, o no (con el motivo, y si fue la red).
export type ResultadoDeGuardar = { ok: true } | { ok: false; sinRed: boolean; mensaje: string }

type Contexto = {
  // Lo que eligió la persona (`null` = nunca eligió: manda el tamaño de fábrica). Sale de su cuenta.
  preferencia: TamanoDePagina | null
  // La elige y la guarda en su cuenta. Se ve al instante; si no se pudo guardar, el resultado lo dice y
  // `guardar` se puede volver a llamar con el mismo valor (guardar lo ya guardado no es un conflicto).
  elegir: (tamano: TamanoDePagina) => Promise<ResultadoDeGuardar>
}

const SIN_PROVEEDOR: Contexto = {
  preferencia: null,
  elegir: () => Promise.resolve({ ok: true }),
}

const ContextoDePorPagina = createContext<Contexto>(SIN_PROVEEDOR)

type Props = {
  // La preferencia guardada, tal como la entrega la sesión.
  inicial: TamanoDePagina | null
  // Cómo se guarda en la cuenta: lo pone quien conoce dónde (`shared` no importa módulos).
  alGuardar: (tamano: TamanoDePagina) => Promise<ResultadoDeGuardar>
  children: ReactNode
}

// «Ítems por página» de la persona, en un solo lugar para todo lo que la muestra o la cambia (el selector de cada
// listado y la pantalla del perfil). Quien la lee en el servidor es cada página, con la sesión.
export function ProveedorPorPagina({ inicial, alGuardar, children }: Props) {
  const [preferencia, setPreferencia] = useState(inicial)
  const elegir = useCallback(
    (tamano: TamanoDePagina) => {
      setPreferencia(tamano)
      return alGuardar(tamano)
    },
    [alGuardar],
  )
  const valor = useMemo(() => ({ preferencia, elegir }), [preferencia, elegir])
  return <ContextoDePorPagina value={valor}>{children}</ContextoDePorPagina>
}

export function usePorPagina(): Contexto {
  return use(ContextoDePorPagina)
}
