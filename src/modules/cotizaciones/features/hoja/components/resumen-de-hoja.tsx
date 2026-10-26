'use client'

import { Button } from '@/shared/ui/button'
import { Monto } from '@/shared/ui/monto'
import {
  secundariosDelResumen,
  totalDelResumen,
  type ContextoDeHoja,
} from '../../../entities/binding'
import type { HojaLista } from '../../../entities/hoja'
import type { EstadoDeRecalculo } from '../../../entities/recalculo'
import { ValorDeNodo } from './valor-de-nodo'

type Props = {
  tarjeta: HojaLista['tarjetaTotal']
  contexto: ContextoDeHoja
  estado: EstadoDeRecalculo
  // Lo que se dice del vehículo: el ajuste lo pide y no hay, o el de la URL no se pudo usar.
  avisoDelVehiculo: string | null
  alReintentar: () => void
  alRecargar: () => void
}

function AvisoDeFallo({
  estado,
  alReintentar,
  alRecargar,
}: Pick<Props, 'estado' | 'alReintentar' | 'alRecargar'>) {
  if (estado.tipo !== 'fallo') {
    return null
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-(length:--text-sm) font-medium text-(--color-peligro-ink)">
        No se pudo recalcular.
      </p>
      <Button
        variant="outline"
        className="min-h-11 md:min-h-8"
        onClick={estado.recargar ? alRecargar : alReintentar}
      >
        {estado.recargar ? 'Recargar' : 'Reintentar'}
      </Button>
    </div>
  )
}

// El resumen: el total de la hoja (sin fijar: el 4.13-4 lo lleva al pie y al costado) y lo que la tarjeta suma aparte. **No deja pasar por bueno un total viejo:** mientras
// se recalcula o si falló, el total se marca desactualizado con su texto. Los avisos van en una región viva; «Recalculando» no se anuncia (pasa cada 150 ms).
export function ResumenDeHoja({
  tarjeta,
  contexto,
  estado,
  avisoDelVehiculo,
  alReintentar,
  alRecargar,
}: Props) {
  const total = totalDelResumen(contexto)
  const viejo = estado.tipo !== 'al_dia'
  const ocupado = estado.tipo === 'esperando' || estado.tipo === 'recalculando'
  const variante = contexto.indice.variante?.etiqueta
  return (
    <aside
      aria-label="Resumen"
      data-resumen=""
      data-viejo={viejo}
      aria-busy={ocupado}
      className="grid gap-2 rounded-(--radius-card) border border-(--color-line-strong) bg-(--color-surface) p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-(length:--text-sm) font-medium [overflow-wrap:anywhere] text-(--color-ink-soft)">
          {tarjeta.etiqueta}
        </span>
        <strong
          data-total=""
          className="text-(length:--text-xl) font-semibold text-(--color-ink) tabular-nums"
        >
          {total.tipo === 'valor' ? <Monto valor={total.usd} moneda="USD" /> : '—'}
        </strong>
      </div>
      {viejo && total.tipo === 'valor' ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">Total desactualizado.</p>
      ) : null}
      {total.tipo === 'faltante' ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">Sin total: {total.motivo}</p>
      ) : null}
      {estado.tipo === 'sin_variante' ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Elige {variante?.toLowerCase() ?? 'una opción'} para calcular.
        </p>
      ) : null}
      <ul className="grid gap-1">
        {secundariosDelResumen(tarjeta.secundarios, contexto.respuesta).map((s) => (
          <li
            key={s.nodo}
            className="flex flex-wrap items-baseline justify-between gap-x-4 text-(length:--text-sm) text-(--color-ink-soft)"
          >
            <span className="[overflow-wrap:anywhere]">{s.etiqueta}</span>
            <ValorDeNodo valor={s.valor} formato={s.formato} />
          </li>
        ))}
      </ul>
      <div role="status" className="grid gap-1">
        <AvisoDeFallo estado={estado} alReintentar={alReintentar} alRecargar={alRecargar} />
        {avisoDelVehiculo === null ? null : (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{avisoDelVehiculo}</p>
        )}
      </div>
    </aside>
  )
}
