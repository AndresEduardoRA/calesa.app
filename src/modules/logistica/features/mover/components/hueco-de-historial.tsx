'use client'

import { formatearFechaHora } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'
import {
  leerHistorialDeLaUnidad,
  NO_SE_LEYO_EL_HISTORIAL,
} from '../../../areas/mover/composicion.client'
import { lineaDelCambio, quienHizoElCambio } from '../../../entities/mover/historial'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { useListaDeLaUnidad } from '../hooks/use-lista-de-la-unidad'
import { CuerpoDeLaLista } from './cuerpo-de-la-lista'

const SUSTANTIVO = { plural: 'cambios', articulo: 'los' } as const

// El hueco «Historial» del panel de la unidad (6.04-2): de sólo lectura, una línea por cambio de fase con quién, cuándo y su nota. Más reciente primero, de a 20 con «Ver más» y «Ir a una
// fecha». Es una lista, no una tabla: nada se abre desde aquí.
export function HuecoDeHistorial({ unidad }: { unidad: Unidad }) {
  const { zonaHoraria } = useRegional()
  const lista = useListaDeLaUnidad(
    unidad,
    leerHistorialDeLaUnidad,
    NO_SE_LEYO_EL_HISTORIAL,
    zonaHoraria,
  )
  return (
    <div className="grid gap-3" data-hueco="historial">
      <CuerpoDeLaLista
        lista={lista}
        zona={zonaHoraria}
        cargando="Cargando el historial"
        vacio="Todavía no hay cambios de fase."
        sustantivo={SUSTANTIVO}
        fila={(cambio) => (
          <li className="grid min-w-0 gap-1 rounded-lg border border-(--color-line) p-3">
            <p className="font-medium break-words">{lineaDelCambio(cambio)}</p>
            <p className="text-(length:--text-sm) text-(--color-ink-soft)">
              {quienHizoElCambio(cambio)} ·{' '}
              <time dateTime={cambio.creadoEn}>
                {formatearFechaHora(cambio.creadoEn, { zona: zonaHoraria })}
              </time>
            </p>
            {cambio.nota ? <p className="break-words whitespace-pre-wrap">{cambio.nota}</p> : null}
          </li>
        )}
      />
    </div>
  )
}
