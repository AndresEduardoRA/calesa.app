'use client'

import { UnaSolaVista } from '@/shared/ui/lista'
import type { EntradaDeAgenda } from '../../../entities/agenda'
import { agruparPorDia, diasDeLaSemana, nombreCortoDelDia } from '../../../entities/calendario'
import { CeldaDeDia } from './celda-de-dia'
import { ListaPorDia } from './lista-por-dia'

type Props = {
  fecha: string
  entradas: readonly EntradaDeAgenda[]
  zona: string
  hoy: string
  hayMas: boolean
  extra: string
}

// La semana: siete columnas desde 768 px y, en el celular, la lista por día. Sin tope de chips por columna: la base ya acota cada clase.
export function VistaDeSemana({ fecha, entradas, zona, hoy, hayMas, extra }: Props) {
  const dias = diasDeLaSemana(fecha)
  const porDia = agruparPorDia(entradas, (entrada) => entrada.instante, zona)
  return (
    <UnaSolaVista
      tabla={() => (
        <div className="grid gap-1">
          <ol
            aria-hidden="true"
            className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-1 text-center text-(length:--text-sm) text-(--color-ink-soft)"
          >
            {dias.map((dia) => (
              <li key={dia}>{nombreCortoDelDia(dia)}</li>
            ))}
          </ol>
          <ol className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-1">
            {dias.map((dia) => (
              <li key={dia} className="min-w-0">
                <CeldaDeDia
                  dia={dia}
                  entradas={porDia.get(dia) ?? []}
                  zona={zona}
                  hoy={hoy}
                  hayMas={hayMas}
                  extra={extra}
                />
              </li>
            ))}
          </ol>
        </div>
      )}
      tarjetas={() => (
        <ListaPorDia entradas={entradas} dias={dias} zona={zona} hoy={hoy} soloConCosas />
      )}
    />
  )
}
