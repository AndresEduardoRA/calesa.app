'use client'

import { useId } from 'react'
import { Bloque } from '@/shared/ui/bloque'
import { Campo } from '@/shared/ui/campo'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { LARGO_MAXIMO_DE_DESCRIPCION, LARGO_MAXIMO_DE_LUGAR } from '../../../entities/edicion'
import type { useFormularioDeEvento } from '../hooks/use-formulario-de-evento'

// Lo secundario de un evento, plegado salvo que traiga un valor o un error: el lugar y la descripción.
export function BloquesDeEvento({
  formulario: f,
}: {
  formulario: ReturnType<typeof useFormularioDeEvento>
}) {
  const id = useId()
  return (
    <>
      <Bloque
        titulo="Lugar"
        plegado={f.valores.lugar === ''}
        forzarAbierto={Boolean(f.errores.lugar)}
      >
        <div className="p-4 pt-0">
          <Campo
            nombre="lugar"
            etiqueta="Dónde es (opcional)"
            value={f.valores.lugar}
            maxLength={LARGO_MAXIMO_DE_LUGAR + 20}
            error={f.errores.lugar}
            onChange={(evento) => {
              f.cambiar('lugar', evento.target.value)
            }}
          />
        </div>
      </Bloque>
      <Bloque
        titulo="Descripción"
        plegado={f.valores.descripcion === ''}
        forzarAbierto={Boolean(f.errores.descripcion)}
      >
        <div className="grid gap-1.5 p-4 pt-0">
          <Label htmlFor={`${id}-descripcion`}>Descripción (opcional)</Label>
          <Textarea
            id={`${id}-descripcion`}
            value={f.valores.descripcion}
            rows={4}
            maxLength={LARGO_MAXIMO_DE_DESCRIPCION + 20}
            aria-invalid={f.errores.descripcion ? true : undefined}
            onChange={(evento) => {
              f.cambiar('descripcion', evento.target.value)
            }}
          />
          {f.errores.descripcion ? (
            <p className="text-(length:--text-sm) text-(--color-peligro-ink)">
              {f.errores.descripcion}
            </p>
          ) : null}
        </div>
      </Bloque>
    </>
  )
}
