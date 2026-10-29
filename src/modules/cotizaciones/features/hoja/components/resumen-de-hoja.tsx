'use client'

import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import { Monto } from '@/shared/ui/monto'
import {
  secundariosDelResumen,
  totalDelResumen,
  type ContextoDeHoja,
} from '../../../entities/binding'
import type { HojaLista } from '../../../entities/hoja'
import type { EstadoDeRecalculo } from '../../../entities/recalculo'
import { LiveDelResumen } from './live-del-resumen'
import { ModoDelResumen } from './modo-del-resumen'
import { TotalEnMonedaLocal } from './total-en-moneda-local'
import { ValorDeNodo } from './valor-de-nodo'

type Props = {
  tarjeta: HojaLista['tarjetaTotal']
  // La moneda del total en la moneda local, si «Ver total Bs» está encendido; nula, no se dibuja.
  monedaDelTotalBs: string | null
  // El nombre del modo de tipo de cambio con que se calculó; nulo, la hoja no tiene modos.
  modo: string | null
  contexto: ContextoDeHoja
  estado: EstadoDeRecalculo
  // Lo que se dice del vehículo: el ajuste lo pide y no hay, o el de la URL no se pudo usar.
  avisoDelVehiculo: string | null
  alReintentar: () => void
  alRecargar: () => void
  guardar: BotonDeGuardar
  // Lo que dice el último guardado (`<AvisoDelGuardado>`): va en la misma región viva.
  avisoDeGuardado: ReactNode
}

export type BotonDeGuardar = {
  // Por qué no se guarda ahora, dicho junto al botón; nulo, se puede.
  motivo: string | null
  // El resumen ya lo dice (sin total, el vehículo que falta): no se repite junto al botón.
  motivoYaDicho: boolean
  // Esperando el total al día o guardando: «Guardando…» y apagado (nunca un doble envío).
  ocupado: boolean
  alGuardar: () => void
}

// «Guardar», además de `Ctrl/Cmd+S` (el celular no tiene atajo). Frena el `mousedown`: así el foco no sale de una celda abierta (un clic afuera descartaría lo que no es un
// número) y el clic hace lo mismo que el atajo, que confirma la celda antes de guardar.
function BotonGuardar({ motivo, motivoYaDicho, ocupado, alGuardar }: BotonDeGuardar) {
  const dicho = motivo !== null && !motivoYaDicho
  return (
    <div className="grid gap-1">
      <Button
        className="min-h-11 justify-self-start md:min-h-8"
        disabled={motivo !== null || ocupado}
        aria-describedby={dicho ? 'motivo-para-no-guardar' : undefined}
        onMouseDown={(evento) => {
          evento.preventDefault()
        }}
        onClick={alGuardar}
      >
        {ocupado ? 'Guardando…' : 'Guardar'}
      </Button>
      {!dicho ? null : (
        <p id="motivo-para-no-guardar" className="text-(length:--text-sm) text-(--color-ink-soft)">
          {motivo}
        </p>
      )}
    </div>
  )
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

// El resumen: el total de la hoja, fijo (al pie en el celular y al costado, a la derecha de las secciones, desde un ancho de la hoja: `sticky`, 4.13-4b3) y lo que la tarjeta suma aparte. **No deja pasar por bueno un total viejo:** mientras
// se recalcula o si falló, el total se marca desactualizado con su texto. Los avisos van en una región viva; «Recalculando» no se anuncia (pasa cada 150 ms).
export function ResumenDeHoja({
  tarjeta,
  monedaDelTotalBs,
  modo,
  contexto,
  estado,
  avisoDelVehiculo,
  alReintentar,
  alRecargar,
  guardar,
  avisoDeGuardado,
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
      data-pie-de-panel=""
      className="sticky bottom-0 z-10 grid max-h-[40dvh] gap-2 overflow-y-auto rounded-(--radius-card) border border-(--color-line-strong) bg-(--color-surface) p-4 @4xl:top-[calc(var(--topbar)+1rem)] @4xl:bottom-auto @4xl:max-h-[calc(100dvh-var(--topbar)-2rem)] @4xl:w-[22rem] @4xl:shrink-0"
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
      {monedaDelTotalBs === null ? null : (
        <TotalEnMonedaLocal respuesta={contexto.respuesta} moneda={monedaDelTotalBs} />
      )}
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
      <ModoDelResumen nombre={modo} />
      <div role="status" className="grid gap-1">
        <AvisoDeFallo estado={estado} alReintentar={alReintentar} alRecargar={alRecargar} />
        {avisoDelVehiculo === null ? null : (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{avisoDelVehiculo}</p>
        )}
        {avisoDeGuardado}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <BotonGuardar {...guardar} />
        <LiveDelResumen />
      </div>
    </aside>
  )
}
