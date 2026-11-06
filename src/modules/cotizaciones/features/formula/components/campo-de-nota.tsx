'use client'

import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { LARGO_MAXIMO_DE_NOTA } from '../../../entities/formula/publicacion'
import type { FormularioDePublicacion } from '../hooks/use-formulario-de-publicacion'

export const ID_DE_LA_NOTA = 'nota-de-la-version'

// La nota de una versión que se publica (publicar el borrador, revertir): para quien lea las versiones. El motivo, junto al campo.
export function CampoDeNota({ formulario }: { formulario: FormularioDePublicacion }) {
  const idError = `${ID_DE_LA_NOTA}-error`
  const idAyuda = `${ID_DE_LA_NOTA}-ayuda`
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={ID_DE_LA_NOTA}>Nota</Label>
      <Textarea
        id={ID_DE_LA_NOTA}
        name={ID_DE_LA_NOTA}
        rows={3}
        maxLength={LARGO_MAXIMO_DE_NOTA + 20}
        value={formulario.nota}
        aria-invalid={formulario.motivoDeNota ? true : undefined}
        aria-describedby={formulario.motivoDeNota ? `${idError} ${idAyuda}` : idAyuda}
        onChange={(evento) => {
          formulario.escribir(evento.target.value)
        }}
      />
      {formulario.motivoDeNota ? (
        <p id={idError} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {formulario.motivoDeNota}
        </p>
      ) : null}
      <p id={idAyuda} className="text-(length:--text-sm) text-(--color-ink-faint)">
        Qué cambia, para quien lea las versiones.
      </p>
    </div>
  )
}
