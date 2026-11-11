'use client'

import { UnaSolaVista } from '@/shared/ui/lista'
import type { EntradaDeAgenda } from '../../../entities/agenda'
import { agruparPorDia, nombreCortoDelDia, semanasDelMes } from '../../../entities/calendario'
import { CeldaDeDia } from './celda-de-dia'
import { ListaPorDia } from './lista-por-dia'

const CHIPS_POR_CELDA = 3

type Props = {
  fecha: string
  entradas: readonly EntradaDeAgenda[]
  zona: string
  hoy: string
  hayMas: boolean
  extra: string
}

// El mes: una grilla de siete columnas desde 768 px y, en el celular, una lista con sólo los días que tienen algo (D2 del 7.07-1).
export function VistaDeMes({ fecha, entradas, zona, hoy, hayMas, extra }: Props) {
  const semanas = semanasDelMes(fecha)
  const porDia = agruparPorDia(entradas, (entrada) => entrada.instante, zona)
  return (
    <UnaSolaVista
      tabla={() => (
        <div className="grid gap-1">
          <ol
            aria-hidden="true"
            className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-1 text-center text-(length:--text-sm) text-(--color-ink-soft)"
          >
            {(semanas[0] ?? []).map((celda) => (
              <li key={celda.dia}>{nombreCortoDelDia(celda.dia)}</li>
            ))}
          </ol>
          <ol className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-1">
            {semanas.flat().map((celda) => (
              <li key={celda.dia} className="min-w-0">
                <CeldaDeDia
                  dia={celda.dia}
                  delMes={celda.delMes}
                  entradas={porDia.get(celda.dia) ?? []}
                  zona={zona}
                  hoy={hoy}
                  maximo={CHIPS_POR_CELDA}
                  hayMas={hayMas}
                  extra={extra}
                />
              </li>
            ))}
          </ol>
        </div>
      )}
      tarjetas={() => (
        <ListaPorDia
          entradas={entradas}
          dias={semanas.flat().map((celda) => celda.dia)}
          zona={zona}
          hoy={hoy}
          soloConCosas
        />
      )}
    />
  )
}
