'use client'

import { useState } from 'react'
import type { Delimitador } from '@/shared/lib/csv/escribir'
import { pedirExportacion, type EstadoDeExportacion } from './pedir-exportacion'

export type { EstadoDeExportacion } from './pedir-exportacion'

// Pide el CSV (un POST con los filtros del listado), espera a que llegue entero y lo descarga. Si el
// flujo se corta a la mitad, no hay archivo: el error se dice y nada queda guardado.
export function useExportacion() {
  const [estado, setEstado] = useState<EstadoDeExportacion>({ tipo: 'reposo' })

  async function exportar(consulta: string, delimitador: Delimitador): Promise<void> {
    setEstado({ tipo: 'descargando' })
    setEstado(await pedirExportacion(consulta, delimitador))
  }

  return { estado, exportar, reiniciar: () => setEstado({ tipo: 'reposo' }) }
}
