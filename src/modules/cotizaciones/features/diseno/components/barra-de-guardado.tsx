'use client'

import { Button } from '@/shared/ui/button'
import {
  GUARDANDO,
  SE_GUARDO,
  SIN_CAMBIOS,
  textoDelGuardado,
  type EstadoDelGuardadoDelDiseno,
} from '../hooks/use-guardar-diseno.soporte'

type Props = {
  nombreDelOrigen: string
  enCurso: boolean
  estado: EstadoDelGuardadoDelDiseno
  // Por qué espera (sin cambios); nulo: listo.
  motivo: string | null
  recargando: boolean
  alGuardar: () => void
  alRecargar: () => void
}

const AVISO =
  'rounded-(--radius-md) bg-(--color-aviso-soft) p-2 text-(length:--text-sm) text-(--color-aviso-ink)'

// Tras guardar y sin cambios, «Se guardó el borrador.» ocupa el lugar de «No hay cambios por guardar.».
function linea(estado: EstadoDelGuardadoDelDiseno, motivo: string | null, enCurso: boolean) {
  if (enCurso) return ''
  if (estado.tipo === 'entro' && motivo === SIN_CAMBIOS) return SE_GUARDO
  return motivo ?? ''
}

// «Guardar el borrador» del diseño, arriba de las secciones: el botón, su línea de estado y, si falló, qué pasó (el conflicto con «Recargar»).
export function BarraDeGuardado({
  nombreDelOrigen,
  enCurso,
  estado,
  motivo,
  recargando,
  alGuardar,
  alRecargar,
}: Props) {
  const conflicto = estado.tipo === 'conflicto'
  const error =
    estado.tipo === 'quieto' || estado.tipo === 'entro'
      ? null
      : textoDelGuardado(estado, nombreDelOrigen)
  return (
    <div data-guardado className="grid min-w-0 gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          className="min-h-11 md:min-h-9"
          disabled={motivo !== null || enCurso || conflicto}
          onClick={alGuardar}
        >
          {enCurso ? GUARDANDO : 'Guardar el borrador'}
        </Button>
        <p role="status" className="min-w-0 text-(length:--text-sm) text-(--color-ink-soft)">
          {linea(estado, motivo, enCurso)}
        </p>
      </div>
      {error !== null ? (
        <div role="alert" className={`grid gap-2 ${AVISO}`}>
          <p>{error}</p>
          {conflicto ? (
            <div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 md:min-h-9"
                disabled={recargando}
                onClick={alRecargar}
              >
                {recargando ? 'Recargando…' : 'Recargar'}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
