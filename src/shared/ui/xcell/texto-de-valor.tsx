'use client'

import { formatearNumero, formatearPorcentaje } from '@/shared/lib/formato'
import { Monto } from '../monto'
import { useRegional } from '../regional'
import type { FormatoDeXCell } from './estado'

type Props = {
  valor: number | null
  formato: FormatoDeXCell
  moneda: string | undefined
  decimales: number | undefined
}

// Lo que dice una celda cuando no se edita. El dinero pasa por `<Monto>` (Modo Live); un porcentaje o un número no son dinero.
export function TextoDeValor({ valor, formato, moneda, decimales }: Props) {
  const { locale } = useRegional()
  if (valor === null) {
    return <>Sin valor</>
  }
  switch (formato) {
    case 'monto':
      return (
        <Monto
          valor={valor}
          {...(moneda === undefined ? {} : { moneda })}
          {...(decimales === undefined ? {} : { decimales })}
        />
      )
    case 'porcentaje':
      return <>{formatearPorcentaje(valor, { locale, decimales: decimales ?? 2 })}</>
    case 'numero':
      return (
        <>{formatearNumero(valor, { locale, ...(decimales === undefined ? {} : { decimales }) })}</>
      )
  }
}
