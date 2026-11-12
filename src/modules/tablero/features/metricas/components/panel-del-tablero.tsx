import { Suspense } from 'react'
import { ZONA_POR_DEFECTO, diaEnZona, formatearDiaYMes } from '@/shared/lib/fechas'
import type { Permisos } from '@/shared/lib/permisos'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { periodoDesde, ventanaDelPeriodo } from '../../../entities/periodo'
import { widgetsParaMontar } from '../widgets/registro'
import { EsqueletoDeWidget } from './esqueleto-de-widget'
import { MarcoDeWidget } from './marco-de-widget'
import { MontajeDeWidget } from './montaje-de-widget'
import { SelectorDePeriodo } from './selector-de-periodo'

type Props = {
  permisos: Permisos
  // El valor crudo de `?periodo=`: uno desconocido cae en «Este mes».
  periodo?: unknown
  // La zona horaria de la empresa: de ella sale qué es «hoy».
  zona?: string
}

// `/tablero`: las métricas del período, en widgets. Cada widget lee por su cuenta tras su `<Suspense>`:
// uno lento o caído no frena ni tumba a los demás. Se arma por permisos, nunca por nombre de rol.
export function PanelDelTablero({ permisos, periodo, zona = ZONA_POR_DEFECTO }: Props) {
  const montajes = widgetsParaMontar(permisos)
  if (montajes.length === 0) {
    return <EstadoSinPermiso />
  }
  const activo = periodoDesde(periodo)
  const ventana = ventanaDelPeriodo(activo, diaEnZona(new Date().toISOString(), { zona }))

  return (
    <div className="grid gap-5">
      <header className="grid gap-3">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Tablero</h1>
        <SelectorDePeriodo activo={activo} />
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {ventana.etiqueta}: del {formatearDiaYMes(ventana.desde)} al{' '}
          {formatearDiaYMes(ventana.hasta)}
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {montajes.map((montaje) => (
          <MarcoDeWidget key={montaje.widget.clave} widget={montaje.widget}>
            <Suspense fallback={<EsqueletoDeWidget />}>
              <MontajeDeWidget montaje={montaje} ventana={ventana} permisos={permisos} />
            </Suspense>
          </MarcoDeWidget>
        ))}
      </div>
    </div>
  )
}
