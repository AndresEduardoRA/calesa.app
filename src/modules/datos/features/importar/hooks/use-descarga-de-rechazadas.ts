'use client'

import { useRef, useState } from 'react'
import { BOM_UTF8, lineasDeCsv } from '@/shared/lib/csv/escribir'
import { descargarCsv } from '@/shared/lib/csv/descargar'
import { leerInformeDeImportacion } from '../../../composicion.client'
import {
  NOMBRE_DE_LAS_RECHAZADAS,
  tablaDeRechazadas,
  type ArchivoEnMemoria,
} from '../../../entities/informe-de-importacion'
import type { ResumenDeImportacion } from '../../../entities/resumen-de-importacion'

// «Descargar las rechazadas» (9.06-5, D54): lee el informe por fila y arma el CSV con `;` y BOM, como `/leads`. Con el archivo de la persona
// en memoria (sólo el asistente que la lanzó) cada fila lleva sus celdas; sin él, fila, resultado, campo y motivo. Una descarga a la vez.
export function useDescargaDeRechazadas() {
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const corriendo = useRef(false)

  async function descargar(resumen: ResumenDeImportacion, archivo: ArchivoEnMemoria | null) {
    if (corriendo.current) return
    corriendo.current = true
    setDescargando(true)
    setError(null)
    try {
      const leido = await leerInformeDeImportacion(resumen.id)
      if (!leido.ok) {
        setError(leido.error.mensaje)
        return
      }
      const tabla = tablaDeRechazadas(leido.data, resumen.entidad, archivo)
      descargarCsv(BOM_UTF8 + lineasDeCsv(tabla, ';'), NOMBRE_DE_LAS_RECHAZADAS)
    } finally {
      corriendo.current = false
      setDescargando(false)
    }
  }

  return {
    descargando,
    error,
    descargar: (resumen: ResumenDeImportacion, archivo: ArchivoEnMemoria | null) => {
      void descargar(resumen, archivo)
    },
  }
}
