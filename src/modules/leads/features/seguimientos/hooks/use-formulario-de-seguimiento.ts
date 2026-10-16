'use client'

import { useMemo, useState } from 'react'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import {
  claveDelBorradorDeSeguimiento,
  hayCambiosEnSeguimiento,
  seguimientoConVersionNueva,
  valoresDelSeguimiento,
} from '../../../entities/edicion-de-seguimiento'
import type { Recordatorio } from '../../../entities/recordatorios'
import type { Seguimiento, ValoresDelSeguimiento } from '../../../entities/seguimiento'
import { conValoresRepuestos } from '../../../entities/seguimiento-nuevo'
import { useEnvioDeSeguimiento } from './use-envio-de-seguimiento'

type Args = {
  leadId: string
  tipos: readonly TipoDeSeguimiento[]
  zona: string
  // Nulo = anotar uno nuevo. Al editar, la última versión de la lista: tras «Recargar» llega la nueva
  // y el conflicto se va, con lo escrito intacto.
  original: Seguimiento | null
  // Cerrado, el modal sigue montado: no escribe borrador ni reenvía al volver la red.
  abierto: boolean
  alGuardar: (seguimiento: Seguimiento, recordatorio: Recordatorio | null) => void
  // «Recargar» tras un conflicto: vuelve a leer la línea de tiempo (lo escrito queda).
  recargar: () => void
  recargando: boolean
}

// Anotar o editar un seguimiento: lo escrito, el borrador de la pestaña (uno por lead al anotar, uno
// por seguimiento al editar; vuelve al reabrir con «Descartar») sólo mientras está abierto, y la
// versión nueva que trae «Recargar» (lo no tocado la toma). El envío es de `useEnvioDeSeguimiento`;
// el contrato del modal, de `ModalDeFormulario`.
export function useFormularioDeSeguimiento({
  leadId,
  tipos,
  zona,
  original,
  abierto,
  alGuardar,
  recargar,
  recargando,
}: Args) {
  const inicial = useMemo(
    () => valoresDelSeguimiento(original, tipos, zona),
    [original, tipos, zona],
  )
  const [valores, setValores] = useState<ValoresDelSeguimiento>(inicial)
  const [inicialVisto, setInicialVisto] = useState(inicial)
  if (inicialVisto !== inicial) {
    setInicialVisto(inicial)
    setValores((antes) => seguimientoConVersionNueva(antes, inicialVisto, inicial))
  }
  const borrador = useBorradorDeEstado({
    activo: abierto,
    clave: claveDelBorradorDeSeguimiento(leadId, original),
    valores,
    guardado: inicial,
    // Lo que vuelve del almacenamiento pasa otra vez por la lista blanca del detalle.
    alReponer: (cambios) => {
      setValores((antes) => conValoresRepuestos(antes, cambios))
    },
  })
  const envio = useEnvioDeSeguimiento({
    leadId,
    tipos,
    zona,
    original,
    valores,
    abierto,
    alGuardar: (seguimiento, recordatorio) => {
      borrador.limpiar()
      alGuardar(seguimiento, recordatorio)
    },
  })

  return {
    ...envio,
    valores,
    recargando,
    recargar,
    // Cerrar ahora perdería lo escrito: el modal pregunta antes.
    hayCambios: hayCambiosEnSeguimiento(valores, inicial),
    cambiar: <K extends keyof ValoresDelSeguimiento>(clave: K, valor: ValoresDelSeguimiento[K]) => {
      setValores((antes) => ({ ...antes, [clave]: valor }))
      envio.resolver(clave)
    },
    reintentar: () => void envio.enviar(),
    // «Descartar» al cerrar con cambios: el borrador también se va.
    descartarBorrador: borrador.limpiar,
  }
}
