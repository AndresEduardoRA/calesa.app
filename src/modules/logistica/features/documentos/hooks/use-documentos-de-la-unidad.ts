'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { diaEnZona } from '@/shared/lib/fechas'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { useRegional } from '@/shared/ui/regional'
import {
  leerDocumentosDeLaUnidad,
  leerRequisitosDeDocumento,
  leerTiposDeLaUnidad,
  NO_SE_CARGARON_LOS_DOCUMENTOS,
  type DocumentosDeLaUnidad,
} from '../../../areas/documentos/composicion.client'
import type { TipoDeDocumento } from '../../../entities/documentos/documento'
import type { RequisitoDeDocumento } from '../../../entities/documentos/requisito'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { useAlCambiarLaUnidad } from '../../nucleo/hooks/eventos-de-la-unidad'

export type DatoDeDocumentos = DocumentosDeLaUnidad & {
  tipos: TipoDeDocumento[]
  requisitos: RequisitoDeDocumento[]
  // El día de la empresa en que se leyó (`YYYY-MM-DD`): «Vencido» se mide contra él. La base compara con su `current_date`; en el borde de la medianoche manda «Qué falta» (D6).
  hoy: string
}

export type LecturaDeDocumentos =
  | { tipo: 'cargando' }
  | { tipo: 'error'; error: ErrorApp }
  | { tipo: 'listo'; dato: DatoDeDocumentos }

// Entre una lectura y la siguiente por volver el foco a la ventana pasan al menos 5 segundos (como «Qué falta»).
const MINIMO_ENTRE_LECTURAS_MS = 5000

type Referencia = Pick<Unidad, 'tipo' | 'id' | 'origenId' | 'faseId'>

async function leerTodo(unidad: Referencia, zona: string): Promise<Resultado<DatoDeDocumentos>> {
  const [lista, tipos, requisitos] = await Promise.all([
    leerDocumentosDeLaUnidad(unidad),
    leerTiposDeLaUnidad(unidad),
    leerRequisitosDeDocumento(unidad.faseId),
  ])
  if (!lista.ok) return lista
  if (!tipos.ok) return tipos
  if (!requisitos.ok) return requisitos
  return {
    ok: true,
    data: {
      ...lista.data,
      tipos: tipos.data,
      requisitos: requisitos.data,
      hoy: diaEnZona(new Date().toISOString(), { zona }),
    },
  }
}

// Los documentos de una unidad (6.06-1): se leen al montarse el bloque, cuando cambia su fase, cuando otro hueco avisa que cambió algo y cuando vuelve el foco a la ventana. Una
// relectura no vuelve al esqueleto: lo que había se sigue viendo. «Reintentar» pasa por «cargando». Una respuesta que llega tarde se descarta.
export function useDocumentosDeLaUnidad(unidad: Unidad) {
  const { zonaHoraria } = useRegional()
  const [lectura, setLectura] = useState<LecturaDeDocumentos>({ tipo: 'cargando' })
  const pedido = useRef(0)
  const ultimaLectura = useRef(0)
  const { id, tipo, origenId, faseId } = unidad

  const leer = useCallback(async () => {
    pedido.current += 1
    const mio = pedido.current
    ultimaLectura.current = Date.now()
    const resultado = await leerTodo({ id, tipo, origenId, faseId }, zonaHoraria).catch(() =>
      fallo('inesperado', NO_SE_CARGARON_LOS_DOCUMENTOS),
    )
    if (mio !== pedido.current) return
    setLectura(
      resultado.ok
        ? { tipo: 'listo', dato: resultado.data }
        : { tipo: 'error', error: resultado.error },
    )
  }, [id, tipo, origenId, faseId, zonaHoraria])

  useEffect(() => {
    void leer()
    return () => {
      pedido.current += 1
    }
  }, [leer])

  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'hidden') return
      if (Date.now() - ultimaLectura.current < MINIMO_ENTRE_LECTURAS_MS) return
      void leer()
    }
    window.addEventListener('focus', alVolver)
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      window.removeEventListener('focus', alVolver)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [leer])

  const releer = useCallback(() => {
    void leer()
  }, [leer])
  useAlCambiarLaUnidad(id, releer)

  return {
    lectura,
    releer,
    reintentar: () => {
      setLectura({ tipo: 'cargando' })
      void leer()
    },
  }
}
