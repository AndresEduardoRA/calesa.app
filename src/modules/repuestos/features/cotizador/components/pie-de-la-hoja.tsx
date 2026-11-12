'use client'

import { Button } from '@/shared/ui/button'
import { Monto } from '@/shared/ui/monto'
import { Textarea } from '@/shared/ui/textarea'
import { LARGO_DE_LAS_NOTAS } from '../../../entities/cotizador/hoja-editable'

type Props = {
  total: string | null
  moneda: string
  notas: string
  errorDeNotas: string | undefined
  enCurso: boolean
  sinGuardar: boolean
  alCambiarNotas: (notas: string) => void
}

// El pie de la hoja editable (8.12-4, C12): el total en vivo (sólo informa, D45; nulo es «Sin total»), las notas (D55) y «Guardar», apagado sin cambios.
export function PieDeLaHoja({
  total,
  moneda,
  notas,
  errorDeNotas,
  enCurso,
  sinGuardar,
  alCambiarNotas,
}: Props) {
  return (
    <footer className="grid gap-3 border-t border-(--color-line) pt-3">
      <p className="flex flex-wrap items-baseline gap-x-2" aria-live="polite">
        <span className="font-semibold">Total</span>
        {total === null ? (
          <span className="text-(--color-ink-soft)">Sin total</span>
        ) : (
          <Monto valor={Number(total)} moneda={moneda} className="font-semibold" />
        )}
      </p>
      <div className="grid gap-1.5">
        <label htmlFor="cotizacion-notas" className="text-(length:--text-sm) font-medium">
          Notas
        </label>
        <Textarea
          id="cotizacion-notas"
          value={notas}
          maxLength={LARGO_DE_LAS_NOTAS}
          disabled={enCurso}
          aria-invalid={errorDeNotas ? true : undefined}
          aria-describedby={errorDeNotas ? 'cotizacion-notas-error' : undefined}
          onChange={(evento) => {
            alCambiarNotas(evento.target.value)
          }}
        />
        {errorDeNotas ? (
          <p
            id="cotizacion-notas-error"
            className="text-(length:--text-sm) text-(--color-peligro-ink)"
          >
            {errorDeNotas}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={enCurso || !sinGuardar}>
          {enCurso ? 'Guardando…' : 'Guardar'}
        </Button>
        {sinGuardar ? (
          <span className="text-(length:--text-sm) text-(--color-ink-soft)">
            Cambios sin guardar
          </span>
        ) : null}
      </div>
    </footer>
  )
}
