'use client'

import { Monto } from '@/shared/ui/monto'
import { decimalesDeValor, type TipoCambio } from '../../../entities/tipos-cambio'

type Props = { tipo: Pick<TipoCambio, 'monedaDe' | 'monedaA' | 'valor'>; className?: string }

// «1 USD = Bs 6,96». El valor es dinero: pasa por <Monto> y el Modo Live lo oculta.
export function ValorDeCambio({ tipo, className }: Props) {
  return (
    <span className={className}>
      <span className="text-(--color-ink-faint)">1 {tipo.monedaDe} = </span>
      <Monto valor={tipo.valor} moneda={tipo.monedaA} decimales={decimalesDeValor(tipo.valor)} />
    </span>
  )
}
