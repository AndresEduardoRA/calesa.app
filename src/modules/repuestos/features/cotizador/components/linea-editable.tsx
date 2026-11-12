'use client'

import { memo } from 'react'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { Monto } from '@/shared/ui/monto'
import { claveDeCelda } from '../../../entities/cotizador/errores'
import type { LineaCalculada } from '../../../entities/cotizador/formula'
import {
  LARGO_DE_LA_DESCRIPCION,
  type LineaEditable as Linea,
} from '../../../entities/cotizador/hoja-editable'
import { CajaDeLaLinea } from './caja-de-la-linea'
import { CeldasDeLaLinea } from './celdas-de-la-linea'
import { MOTIVO } from './lineas-del-bloque'

export type AccionesDeLinea = {
  alConfirmarNumero: (id: string, valor: number | null) => void
  alReiniciar: (id: string) => void
  alCambiarTexto: (id: string, campo: 'descripcion' | 'caja', valor: string | null) => void
  quitar: (id: string) => void
}

type Props = {
  linea: Linea
  calculada: LineaCalculada | undefined
  nombre: string
  moneda: string
  cajas: readonly string[]
  errores: Readonly<Record<string, string>>
  bloqueada: string | undefined
  acciones: AccionesDeLinea
}

function TotalDeLaLinea({
  calculada,
  moneda,
}: {
  calculada: LineaCalculada | undefined
  moneda: string
}) {
  if (calculada?.total) return <Monto valor={Number(calculada.total)} moneda={moneda} />
  const motivo = calculada?.falta ? MOTIVO[calculada.falta] : null
  return <span className="text-(--color-ink-soft)">Sin total{motivo ? ` · ${motivo}` : ''}</span>
}

// Una línea de la hoja editable (8.12-4, C10): la descripción, la cantidad, el costo y la logística en `XCell` (↺ vuelve a la sugerida del tramo; sin
// tramo, la celda queda vacía y el total dice «Falta la logística», D43), la caja de las del snapshot y el total en vivo con `<Monto>` (D42). Los
// números de la celda pasan a texto exacto en el hook; acá sólo se convierten a `number` para dibujarlos (D20).
export const LineaEditable = memo(function LineaEditable({
  linea,
  calculada,
  nombre,
  moneda,
  cajas,
  errores,
  bloqueada,
  acciones,
}: Props) {
  const error = (campo: Parameters<typeof claveDeCelda>[1]) =>
    errores[claveDeCelda(linea.id, campo)]
  return (
    <li
      aria-label={nombre}
      className="grid min-w-0 gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <Campo
            nombre={`${linea.id}-descripcion`}
            etiqueta="Descripción"
            value={linea.descripcion}
            maxLength={LARGO_DE_LA_DESCRIPCION}
            autoComplete="off"
            disabled={bloqueada !== undefined}
            error={error('descripcion')}
            onChange={(evento) => {
              acciones.alCambiarTexto(linea.id, 'descripcion', evento.target.value)
            }}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={bloqueada !== undefined}
          onClick={() => {
            acciones.quitar(linea.id)
          }}
        >
          Quitar línea
        </Button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] items-start gap-3">
        <CeldasDeLaLinea
          linea={linea}
          sugerida={calculada?.logisticaSugerida ?? null}
          moneda={moneda}
          errores={errores}
          bloqueada={bloqueada}
          acciones={acciones}
        />
        <CajaDeLaLinea
          lineaId={linea.id}
          valor={linea.caja}
          cajas={cajas}
          moneda={moneda}
          error={error('caja')}
          deshabilitada={bloqueada !== undefined}
          alCambiar={acciones.alCambiarTexto}
        />
        <div className="grid gap-1 text-(length:--text-sm)">
          <span className="text-(--color-ink-faint)">Total</span>
          <TotalDeLaLinea calculada={calculada} moneda={moneda} />
        </div>
      </div>
    </li>
  )
})
