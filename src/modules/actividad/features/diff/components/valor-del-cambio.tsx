'use client'

import { formatearFecha, formatearHora } from '@/shared/lib/fechas'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import type { ValorPresentado } from '../../../entities/diff'

// Un lado de un cambio. Un monto va por `<Monto>`: con su moneda, con la base o, si no se conoce, sólo el número y «(moneda sin conocer)».
export function ValorDelCambio({ valor }: { valor: ValorPresentado }) {
  const { zonaHoraria } = useRegional()
  switch (valor.tipo) {
    case 'vacio':
      return (
        <span>
          <span aria-hidden="true">—</span>
          <span className="sr-only">Vacío</span>
        </span>
      )
    case 'monto':
      if (valor.enMonedaBase) {
        return <Monto valor={valor.valor} />
      }
      if (!valor.monedaConocida || valor.moneda === null) {
        return (
          <span>
            <Monto valor={valor.valor} moneda={null} />{' '}
            <span className="text-(--color-ink-soft)">(moneda sin conocer)</span>
          </span>
        )
      }
      return <Monto valor={valor.valor} moneda={valor.moneda} />
    case 'fecha':
      return (
        <span className="tabular-nums">
          {formatearFecha(valor.iso, { zona: zonaHoraria })}{' '}
          {formatearHora(valor.iso, { zona: zonaHoraria })}
        </span>
      )
    case 'si_no':
      return <span>{valor.valor ? 'Sí' : 'No'}</span>
    case 'texto':
      return <span className="[overflow-wrap:anywhere]">{valor.texto}</span>
  }
}
