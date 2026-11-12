'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisarExito } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import type { CotizacionLeida, LineaDeLectura } from '../../../entities/cotizador/hoja-de-lectura'
import {
  calcularHoja,
  hayCambios,
  lineaEditableDesde,
  pedidoDeGuardar,
} from '../../../entities/cotizador/hoja-editable'
import type { SnapshotDelCotizador } from '../../../entities/cotizador/snapshot'
import { guardarCotizacion } from '../actions/guardar-cotizacion'
import { useLineasEditables } from './use-lineas-editables'

const MENSAJE_DE_VALIDACION = 'Revisa las líneas de la cotización.'

type Args = {
  cotizacion: CotizacionLeida
  snapshot: SnapshotDelCotizador
  lineas: readonly LineaDeLectura[]
  proyectoId: string
}

// El estado de la hoja editable (8.12-4, C10–C12). Las líneas viven acá con sus montos como texto exacto; lo que emite una `XCell` pasa por
// `montoDeCelda`/`cantidadDeCelda` y, si no sirve, no entra y la celda muestra el error. El total en vivo es `calcularHoja` (sólo informa, D45). Guardar
// manda todas las líneas con la versión; si sale bien, la página se relee y quien monta la hoja le da `key` = la versión: nace de lo guardado.
export function useHojaDeCotizacion({ cotizacion, snapshot, lineas: leidas, proyectoId }: Args) {
  const router = useRouter()
  const iniciales = useMemo(() => leidas.map(lineaEditableDesde), [leidas])
  const notasIniciales = cotizacion.notas ?? ''
  const [notas, setNotas] = useState(notasIniciales)
  const { lineas, setLineas, errores, setErrores, acciones } = useLineasEditables(iniciales)
  const [aviso, setAviso] = useState<ErrorApp | null>(null)
  const { mandar, enCurso } = useUnEnvioALaVez()

  async function guardar() {
    setAviso(null)
    const envio = await mandar(() =>
      enviarAccion(
        guardarCotizacion({
          id: cotizacion.id,
          proyectoId,
          actualizadoEn: cotizacion.actualizadoEn,
          notas: notas.trim() === '' ? null : notas,
          lineas: pedidoDeGuardar(lineas),
        }),
        MENSAJE_DE_VALIDACION,
      ),
    )
    if (envio === null) return
    if (envio.ok) {
      setErrores({})
      avisarExito('Cotización guardada.')
      return
    }
    const porCampo = 'porCampo' in envio ? envio.porCampo : undefined
    setErrores(porCampo ?? {})
    setAviso(envio.error)
  }

  // Tras un conflicto: descarta lo local y trae la versión nueva (la página se relee y la hoja nace de ella).
  function recargar() {
    setLineas(iniciales)
    setNotas(notasIniciales)
    setErrores({})
    setAviso(null)
    router.refresh()
  }

  const calculo = useMemo(() => calcularHoja(snapshot, lineas), [snapshot, lineas])

  return {
    lineas,
    notas,
    setNotas,
    errores,
    aviso,
    enCurso,
    calculo,
    sinGuardar: hayCambios(iniciales, lineas, notasIniciales, notas),
    acciones,
    guardar,
    recargar,
  }
}
