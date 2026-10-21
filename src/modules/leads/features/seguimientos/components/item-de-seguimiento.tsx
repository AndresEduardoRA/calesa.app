'use client'

import { IconoDelCatalogo } from '@/shared/ui/icono-del-catalogo/icono-del-catalogo'
import { EyeIcon } from 'lucide-react'
import { formatearFechaHora, fechaRelativa } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { autorDe, ETIQUETA_DE_VISIBLE, type Seguimiento } from '../../../entities/seguimiento'
import { nombreDelVehiculoDeNota } from '../../../entities/vehiculo-de-nota'
import { DocumentoDeSeguimiento } from './documento-de-seguimiento'

type Props = {
  seguimiento: Seguimiento
  zona: string
  // Mío y con el lead en la cartera.
  editable: boolean
  enCurso: boolean
  alEditar: () => void
  alEliminar: () => void
}

// Un seguimiento en la línea de tiempo: tipo, resumen, cuándo, quién y el detalle. El tipo se
// nombra con lo que dice la base.
export function ItemDeSeguimiento({
  seguimiento,
  zona,
  editable,
  enCurso,
  alEditar,
  alEliminar,
}: Props) {
  // El vehículo de la nota: nombrado si se ve; a su autor se le dice que había uno.
  const vehiculo = nombreDelVehiculoDeNota(seguimiento)
  return (
    <article
      aria-label={seguimiento.titulo}
      className="grid gap-2 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3"
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <IconoDelCatalogo clave={seguimiento.tipoIcono} className="size-3" />
              {seguimiento.tipoNombre}
            </Badge>
            {seguimiento.visibilidad === 'publico' ? (
              <Badge variant="outline" className="gap-1">
                <EyeIcon aria-hidden className="size-3" />
                {ETIQUETA_DE_VISIBLE}
              </Badge>
            ) : null}
          </div>
          <h3 className="text-(length:--text-sm) font-semibold text-(--color-ink)">
            {seguimiento.titulo}
          </h3>
          <p className="text-(length:--text-xs) text-(--color-ink-faint)">
            <time
              dateTime={seguimiento.ocurridoEn}
              title={formatearFechaHora(seguimiento.ocurridoEn, { zona })}
            >
              {fechaRelativa(seguimiento.ocurridoEn, { zona })}
            </time>
            {' · '}
            {autorDe(seguimiento)}
            {vehiculo ? ` · ${vehiculo}` : null}
          </p>
        </div>
        {editable ? (
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-11 md:min-h-7"
              data-seguimiento-editar={seguimiento.id}
              onClick={alEditar}
              disabled={enCurso}
            >
              Editar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-11 md:min-h-7"
              onClick={alEliminar}
              disabled={enCurso}
            >
              Eliminar
            </Button>
          </div>
        ) : null}
      </header>
      <DocumentoDeSeguimiento documento={seguimiento.detalleDoc} texto={seguimiento.detalleTexto} />
    </article>
  )
}
