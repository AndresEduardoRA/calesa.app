'use client'

import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import { TOPE_DE_AVISOS, type AvisoDeRevision } from '../../../entities/revisar/avisos'
import { useFaseAbierta } from '../../configuracion/hooks/use-fase-abierta'
import { AvisoDeRevisionEnLaLista } from './aviso-de-revision'

type Props = {
  id: string
  abierta: boolean
  flujo: FlujoParaConfigurar
  avisos: readonly AvisoDeRevision[]
  hayMas: boolean
}

// La franja abierta: los avisos ya ordenados (error › aviso › información) y, si llegó al tope, el aviso al pie. Un aviso de una fase que no está entre las
// leídas del flujo va sin «Abrir la fase».
export function ListaDeAvisos({ id, abierta, flujo, avisos, hayMas }: Props) {
  const { abrir } = useFaseAbierta()
  const nombres = new Map(flujo.fases.map((f) => [f.id, f.nombre]))
  return (
    <div id={id} hidden={!abierta} className="grid min-w-0 gap-1 text-(--color-ink)">
      <ul className="grid grid-cols-[minmax(0,1fr)]">
        {avisos.map((aviso, i) => (
          <AvisoDeRevisionEnLaLista
            key={`${aviso.codigo}:${aviso.faseId ?? ''}:${String(i)}`}
            aviso={aviso}
            nombreDeLaFase={aviso.faseId !== null ? (nombres.get(aviso.faseId) ?? null) : null}
            alAbrirLaFase={abrir}
          />
        ))}
      </ul>
      {hayMas ? (
        <AvisoDeTope texto={`Mostrando los primeros ${String(TOPE_DE_AVISOS)} avisos.`} />
      ) : null}
    </div>
  )
}
