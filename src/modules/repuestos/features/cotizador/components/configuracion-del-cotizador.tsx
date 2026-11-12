'use client'

import {
  agruparPorMoneda,
  type LecturaDeLaConfiguracion,
} from '../../../entities/cotizador/filas-de-configuracion'
import { useModalDeConfiguracion } from '../hooks/use-modal-de-configuracion'
import { Cajas } from './cajas'
import { FormulaVigente } from './formula-vigente'
import { HistorialDeLaFormula } from './historial-de-la-formula'
import { ModalesDeConfiguracion } from './modales-de-configuracion'
import { TramosDeLogistica } from './tramos-de-logistica'

type Props = {
  lectura: LecturaDeLaConfiguracion
  // Los códigos de las monedas activas, en su orden.
  monedasActivas: readonly string[]
}

// Configuración › Repuestos › «Cotizador» (8.12-2, C8–C9): la fórmula vigente con su historial, los tramos de logística y las cajas por moneda. Lo lee la
// página en el servidor; cada action renueva la ruta (`revalidatePath`). Escribir lo exige `repuestos.configurar` (la RLS); la página ya lo pide.
export function ConfiguracionDelCotizador({ lectura, monedasActivas }: Props) {
  const grupos = agruparPorMoneda(monedasActivas, lectura.tramos, lectura.cajas)
  const modal = useModalDeConfiguracion({
    activas: monedasActivas,
    tramos: lectura.tramos,
    cajas: lectura.cajas,
  })

  return (
    <div className="grid gap-10">
      <section aria-labelledby="formula-del-cotizador" className="grid gap-4">
        <h2
          id="formula-del-cotizador"
          className="text-(length:--text-lg) font-semibold text-(--color-ink)"
        >
          Fórmula
        </h2>
        <FormulaVigente key={lectura.vigente?.id ?? 'sin-vigente'} vigente={lectura.vigente} />
        <HistorialDeLaFormula
          historial={lectura.historial}
          hayMas={lectura.hayMasHistorial}
          monedaDelRedondeo={monedasActivas.length === 1 ? (monedasActivas[0] ?? null) : null}
        />
      </section>
      <TramosDeLogistica
        grupos={grupos}
        hayMas={lectura.hayMasTramos}
        alAgregar={(moneda) => {
          modal.abrir('tramo', moneda, null)
        }}
        alEditar={(moneda, id) => {
          modal.abrir('tramo', moneda, id)
        }}
      />
      <Cajas
        grupos={grupos}
        hayMas={lectura.hayMasCajas}
        alAgregar={(moneda) => {
          modal.abrir('caja', moneda, null)
        }}
        alEditar={(moneda, id) => {
          modal.abrir('caja', moneda, id)
        }}
      />
      <ModalesDeConfiguracion modal={modal} />
    </div>
  )
}
