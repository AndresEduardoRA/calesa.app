'use client'

import { cortarAlTope, textoDelTope } from '@/shared/lib/conteo'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import { MOTIVO_SIN_PERMISO_HISTORIAL } from '../../../entities/motivos'
import {
  CAMBIOS_A_LA_VISTA,
  decimalesDeValor,
  type CambioDeValor,
} from '../../../entities/tipos-cambio'

type Props = {
  // null = quien mira no puede ver el historial. Llega con uno de más (`CAMBIOS_A_LA_VISTA` + 1) para saber si hay otros.
  cambios: readonly CambioDeValor[] | null
  // La moneda en la que está expresado el valor.
  moneda: string
}

function Valor({ valor, moneda }: { valor: number; moneda: string }) {
  return <Monto valor={valor} moneda={moneda} decimales={decimalesDeValor(valor)} />
}

// Los últimos valores de un tipo de cambio: de cuánto a cuánto, quién y cuándo (en la zona de la
// empresa). Lo escribe un trigger: desde acá sólo se lee.
export function Historial({ cambios, moneda }: Props) {
  const { zonaHoraria } = useRegional()
  const vista = cambios === null ? null : cortarAlTope(cambios, CAMBIOS_A_LA_VISTA)

  return (
    <section aria-labelledby="historial-titulo" className="grid gap-2">
      <h3 id="historial-titulo" className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Historial
      </h3>
      {vista === null ? (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          {MOTIVO_SIN_PERMISO_HISTORIAL}
        </p>
      ) : (
        <ol className="grid gap-1.5">
          {vista.filas.map((cambio) => (
            <li
              key={cambio.id}
              className="grid gap-0.5 rounded-(--radius-md) bg-(--color-surface-2) px-3 py-2 text-(length:--text-sm)"
            >
              <span className="text-(--color-ink)">
                {cambio.valorAnterior === null ? (
                  <>
                    Nació en <Valor valor={cambio.valorNuevo} moneda={moneda} />
                  </>
                ) : (
                  <>
                    <Valor valor={cambio.valorAnterior} moneda={moneda} /> →{' '}
                    <Valor valor={cambio.valorNuevo} moneda={moneda} />
                  </>
                )}
              </span>
              <span className="text-(--color-ink-faint)">
                {cambio.cambiadoPor ? `${cambio.cambiadoPor} · ` : ''}
                {formatearFechaHora(cambio.cambiadoEn, { zona: zonaHoraria })}
              </span>
            </li>
          ))}
        </ol>
      )}
      {vista?.hayMas ? (
        <AvisoDeTope texto={textoDelTope(CAMBIOS_A_LA_VISTA, { sustantivo: 'cambios' })} />
      ) : null}
    </section>
  )
}
