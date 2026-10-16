'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { localDeInstante } from '@/shared/lib/fechas'
import { useAtajo } from '@/shared/ui/atajos'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import {
  hayCambiosEnRecordatorio,
  valoresDelRecordatorio,
  type ErroresDelRecordatorio,
  type Recordatorio,
  type ValoresDelRecordatorio,
} from '../../../entities/recordatorios'
import type { ResultadoDeRecordatorio } from '../../../entities/repositorios'
import { useEnvioDeRecordatorio } from './use-envio-de-recordatorio'

type Args = {
  leadId: string
  zona: string
  // Nulo = agendar uno nuevo. Al editar, la última versión que trajo la página: tras «Recargar» llega
  // la nueva y el conflicto se va, con lo escrito intacto.
  original: Recordatorio | null
  // Sólo abierto responden `Ctrl/Cmd+S` y `Ctrl/Cmd+Enter`: cerrado, el modal sigue montado.
  abierto: boolean
  alGuardar: (recordatorio: ResultadoDeRecordatorio['recordatorio']) => void
}

// Agendar o cambiar un recordatorio: título, cuándo (a futuro, en la zona de la empresa) y el vehículo.
// Lo escrito y no guardado queda como borrador de la pestaña, por recordatorio (o el nuevo de este
// lead), y vuelve al reabrir con «Descartar». El envío es de `useEnvioDeRecordatorio`.
export function useFormularioDeRecordatorio({ leadId, zona, original, abierto, alGuardar }: Args) {
  const router = useRouter()
  const [recargando, recargar] = useTransition()
  const cuandoOriginal = original ? localDeInstante(original.recordarEn, { zona }) : ''
  const inicial = useMemo(
    () => valoresDelRecordatorio(original, cuandoOriginal),
    [original, cuandoOriginal],
  )
  const [valores, setValores] = useState<ValoresDelRecordatorio>(inicial)
  const borrador = useBorradorDeEstado({
    clave: original ? `recordatorio-${original.id}` : `recordatorio-nuevo-${leadId}`,
    valores,
    guardado: inicial,
    alReponer: (cambios) => {
      setValores((antes) => ({ ...antes, ...cambios }))
    },
  })
  const envio = useEnvioDeRecordatorio({
    leadId,
    zona,
    original,
    cuandoOriginal,
    valores,
    alGuardar: (recordatorio) => {
      borrador.limpiar()
      alGuardar(recordatorio)
    },
  })
  useAtajo('guardar', () => void envio.enviar(), abierto && !envio.enCurso)
  useAtajo('guardarYSeguir', () => void envio.enviar(), abierto && !envio.enCurso)

  const escribir =
    (campo: keyof ValoresDelRecordatorio, error?: keyof ErroresDelRecordatorio) =>
    (valor: string) => {
      setValores((antes) => ({ ...antes, [campo]: valor }))
      if (error) {
        envio.resolver(error)
      }
    }

  return {
    ...valores,
    ...envio,
    recargando,
    // Cerrar ahora perdería lo escrito: el modal pregunta antes.
    hayCambios: hayCambiosEnRecordatorio(valores, inicial),
    cambiarTitulo: escribir('titulo', 'titulo'),
    cambiarCuando: escribir('cuando', 'recordarEn'),
    cambiarVehiculo: escribir('vehiculo'),
    reintentar: () => void envio.enviar(),
    // Trae la versión de ahora; lo escrito queda.
    recargar: () => {
      recargar(() => {
        router.refresh()
      })
    },
    // «Descartar» al cerrar con cambios: el borrador también se va.
    descartarBorrador: borrador.limpiar,
  }
}
