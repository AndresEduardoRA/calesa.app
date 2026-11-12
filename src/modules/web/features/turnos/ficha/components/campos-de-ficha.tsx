'use client'

import { Campo } from '@/shared/ui/campo'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import {
  CARGO_MAX,
  ESPECIALIDADES_MAX,
  HANDLE_MAX,
  PRESENTACION_MAX,
  textoDeEspecialidades,
  type MiFichaEnLaWeb,
} from '../../../../entities/turnos/ficha'
import type { ErroresDeFicha } from '../hooks/use-guardar-ficha'

// Los cinco campos de texto de la ficha: sin estado propio, el formulario los lee por su `name` al guardar.
export function CamposDeFicha({
  ficha,
  errores,
}: {
  ficha: MiFichaEnLaWeb
  errores: ErroresDeFicha
}) {
  return (
    <>
      <Campo
        nombre="whatsapp"
        etiqueta="WhatsApp"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+59170000000"
        defaultValue={ficha.whatsapp ?? ''}
        ayuda="Escríbelo con el código del país, por ejemplo +591…. Lo necesitas para recibir turnos de la web."
        error={errores['whatsapp']}
      />
      <Campo
        nombre="handle"
        etiqueta="Identificador"
        autoComplete="off"
        autoCapitalize="none"
        maxLength={HANDLE_MAX + 10}
        defaultValue={ficha.handle ?? ''}
        ayuda="Es tu dirección en la web: minúsculas, números y . _ -. Nadie más puede tener el mismo."
        error={errores['handle']}
      />
      <Campo
        nombre="cargo"
        etiqueta="Cargo"
        autoComplete="off"
        maxLength={CARGO_MAX + 10}
        defaultValue={ficha.cargo ?? ''}
        error={errores['cargo']}
      />
      <div className="grid gap-1.5">
        <Label htmlFor="presentacion">Presentación</Label>
        <Textarea
          id="presentacion"
          name="presentacion"
          rows={4}
          maxLength={PRESENTACION_MAX + 50}
          defaultValue={ficha.presentacion ?? ''}
          aria-invalid={errores['presentacion'] ? true : undefined}
          aria-describedby={errores['presentacion'] ? 'presentacion-error' : undefined}
        />
        {errores['presentacion'] ? (
          <p id="presentacion-error" className="text-(length:--text-sm) text-(--color-peligro-ink)">
            {errores['presentacion']}
          </p>
        ) : null}
      </div>
      <Campo
        nombre="especialidades"
        etiqueta="Especialidades"
        autoComplete="off"
        defaultValue={textoDeEspecialidades(ficha.especialidades)}
        ayuda={`Separadas por coma, hasta ${String(ESPECIALIDADES_MAX)}.`}
        error={errores['especialidades']}
      />
    </>
  )
}
