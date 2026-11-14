'use client'

import { useEffect } from 'react'
import { registrarVisto } from '../../../composicion.client'
import type { ModuloDeVistos, TipoDeVistos } from '../../../entities/vistos'
import { usePreferenciaDeVistos } from './proveedor-de-vistos'

// Abrir la ficha de un registro lo marca visto en su módulo (la base no vuelve a escribir dentro de 30 s). No dibuja nada.
export function RegistrarVisto({
  modulo,
  tipo,
  id,
}: {
  modulo: ModuloDeVistos
  tipo: TipoDeVistos
  id: string
}) {
  const { activado } = usePreferenciaDeVistos()
  useEffect(() => {
    if (activado) void registrarVisto(modulo, tipo, id)
  }, [modulo, tipo, id, activado])
  return null
}
