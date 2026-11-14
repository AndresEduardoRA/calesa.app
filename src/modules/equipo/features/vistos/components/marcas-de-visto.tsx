'use client'

import { useEffect, type ReactNode } from 'react'
import { ProveedorDeVistosDeLista } from '@/shared/ui/lista'
import type { ModuloDeVistos, TipoDeVistos } from '../../../entities/vistos'
import { useVistos } from '../hooks/use-vistos'

type Props = {
  modulo: ModuloDeVistos
  tipo: TipoDeVistos
  // Los ids de la página que se dibuja: una lectura por página.
  ids: readonly string[]
  // El registro abierto ahora (el resumen de `?vehiculo=`, `?lead=`…): abrirlo, también desde la URL, lo marca visto.
  abierto: string | null
  children: ReactNode
}

// Las marcas de «visto» de una página de una lista: las filas y tarjetas de `@/shared/ui/lista` las leen solas con `idDeVisto`.
export function ProveedorDeMarcasDeVisto({ modulo, tipo, ids, abierto, children }: Props) {
  const { marca, abrir } = useVistos(modulo, tipo, ids)
  useEffect(() => {
    if (abierto !== null) abrir(abierto)
  }, [abierto, abrir])
  return <ProveedorDeVistosDeLista marca={marca}>{children}</ProveedorDeVistosDeLista>
}
