'use client'

import { cn } from 'cn'
import { formatearMonto, formatearNumero } from '@/shared/lib/formato'
import { useRegional } from './regional'

type Props = {
  valor: number
  // Código ISO. Sin él, la moneda base de la empresa. `null`: la moneda no se conoce (un cambio viejo de la actividad): sólo el número,
  // sin inventar ninguna, y oculto igual en el Modo Live.
  moneda?: string | null
  decimales?: number
  className?: string
}

// Único lugar donde se imprime dinero. Siempre van las dos versiones al DOM y el CSS elige según
// la clase del Modo Live en <html> (la que conmuta `useLive()`): así no hay un instante, antes
// de hidratar, en que la cifra se vea. Con el modo encendido el valor sale de la vista y del
// árbol de accesibilidad, símbolo de moneda incluido.
export function Monto({ valor, moneda, decimales, className }: Props) {
  const { locale, monedaBase } = useRegional()
  const texto =
    moneda === null
      ? formatearNumero(valor, { locale, decimales })
      : formatearMonto(valor, { moneda: moneda ?? monedaBase, locale, decimales })

  return (
    <span data-monto className={cn('tabular-nums', className)}>
      <span data-monto-valor>{texto}</span>
      <span data-monto-oculto aria-label="Monto oculto">
        •••
      </span>
    </span>
  )
}
