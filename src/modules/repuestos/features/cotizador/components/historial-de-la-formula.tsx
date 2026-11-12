'use client'

import { textoDelTope } from '@/shared/lib/conteo'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { formatearNumero, formatearPorcentaje } from '@/shared/lib/formato'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Badge } from '@/shared/ui/badge'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import {
  TOPE_DEL_HISTORIAL,
  type ConfiguracionDelCotizador,
} from '../../../entities/cotizador/filas-de-configuracion'

type Props = {
  historial: readonly ConfiguracionDelCotizador[]
  hayMas: boolean
  // La moneda del redondeo, si hay una sola activa; con varias, el redondeo se dibuja como número (vale para todas, D26).
  monedaDelRedondeo: string | null
}

// El historial de la fórmula (8.12-2, C8): una fila por configuración publicada, la más nueva primero y marcada «Vigente». `Number` sólo para dibujar
// (D20): lo que se guarda viaja como texto.
export function HistorialDeLaFormula({ historial, hayMas, monedaDelRedondeo }: Props) {
  const { locale, zonaHoraria } = useRegional()
  if (historial.length === 0) return null
  const numero = (texto: string, decimales: number) =>
    formatearNumero(Number(texto), { locale, decimales })
  return (
    <section aria-labelledby="historial-de-la-formula" className="grid gap-2">
      <h3
        id="historial-de-la-formula"
        className="text-(length:--text-sm) font-medium text-(--color-ink)"
      >
        Historial
      </h3>
      <ol className="grid gap-1.5">
        {historial.map((config, i) => (
          <li
            key={config.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-(--radius-md) bg-(--color-surface-2) px-3 py-2 text-(length:--text-sm)"
          >
            <span className="text-(--color-ink-faint)">
              {formatearFechaHora(config.vigenteDesde, { zona: zonaHoraria })}
            </span>
            <span>Factor {numero(config.factorImportado, 4)}</span>
            <span>
              Recargo {formatearPorcentaje(Number(config.recargoLocal), { locale, decimales: 2 })}
            </span>
            <span>
              Redondeo{' '}
              {monedaDelRedondeo ? (
                <Monto valor={Number(config.redondeo)} moneda={monedaDelRedondeo} />
              ) : (
                numero(config.redondeo, 2)
              )}
            </span>
            {i === 0 ? <Badge>Vigente</Badge> : null}
          </li>
        ))}
      </ol>
      {hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DEL_HISTORIAL, {
            sustantivo: 'configuraciones',
            articulo: 'las',
            orden: 'más recientes',
          })}
        />
      ) : null}
    </section>
  )
}
