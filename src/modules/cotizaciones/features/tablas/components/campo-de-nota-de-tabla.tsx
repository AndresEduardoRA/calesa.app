'use client'

import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { LARGO_MAXIMO_DE_NOTA } from '../../../entities/tablas/publicacion'
import type { PublicacionDeTablaEnCurso } from '../hooks/use-publicacion-de-tabla'

export const ID_DE_LA_NOTA_DE_TABLA = 'nota-de-la-tabla'

// La nota de la versión de una tabla que se publica (copia de la de la fórmula: un área no importa otra). El motivo, junto al campo.
export function CampoDeNotaDeTabla({ formulario }: { formulario: PublicacionDeTablaEnCurso }) {
  const idError = `${ID_DE_LA_NOTA_DE_TABLA}-error`
  const idAyuda = `${ID_DE_LA_NOTA_DE_TABLA}-ayuda`
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={ID_DE_LA_NOTA_DE_TABLA}>Nota</Label>
      <Textarea
        id={ID_DE_LA_NOTA_DE_TABLA}
        name={ID_DE_LA_NOTA_DE_TABLA}
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
