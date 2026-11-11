'use client'

import { Campo } from '@/shared/ui/campo'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import type { BorradorDeTipo } from '../../../entities/documentos/formulario-de-tipo'
import {
  LARGO_MAXIMO_DE_LA_DESCRIPCION,
  LARGO_MAXIMO_DEL_NOMBRE,
} from '../../../entities/documentos/tipo-de-documento'

type Props = {
  valores: BorradorDeTipo
  errores: Record<string, string>
  alEscribir: (cambios: Partial<BorradorDeTipo>, campo: string) => void
}

// El id del nombre es donde cae el foco al abrir el modal.
export const ID_DEL_NOMBRE = 'nombre'
const ID_DE_LA_DESCRIPCION = 'descripcion'

// El nombre y la descripción de un tipo de documento, cada uno con su motivo junto al campo.
export function CamposDeTexto({ valores, errores, alEscribir }: Props) {
  const errorDeDescripcion = errores['descripcion']
  return (
    <>
      <Campo
        nombre={ID_DEL_NOMBRE}
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DEL_NOMBRE + 20}
        value={valores.nombre}
        onChange={(evento) => {
          alEscribir({ nombre: evento.target.value }, 'nombre')
        }}
        error={errores['nombre']}
        ayuda={`Hasta ${String(LARGO_MAXIMO_DEL_NOMBRE)} caracteres. Dos tipos de la misma lista no pueden llamarse igual.`}
      />
      <div className="grid gap-1.5">
        <Label htmlFor={ID_DE_LA_DESCRIPCION}>Descripción (opcional)</Label>
        <Textarea
          id={ID_DE_LA_DESCRIPCION}
          name={ID_DE_LA_DESCRIPCION}
          rows={3}
          maxLength={LARGO_MAXIMO_DE_LA_DESCRIPCION + 20}
          value={valores.descripcion}
          aria-invalid={errorDeDescripcion ? true : undefined}
          aria-describedby={errorDeDescripcion ? `${ID_DE_LA_DESCRIPCION}-error` : undefined}
          onChange={(evento) => {
            alEscribir({ descripcion: evento.target.value }, 'descripcion')
          }}
        />
        {errorDeDescripcion ? (
          <p
            id={`${ID_DE_LA_DESCRIPCION}-error`}
            className="text-(length:--text-sm) text-(--color-peligro-ink)"
          >
            {errorDeDescripcion}
          </p>
        ) : null}
      </div>
    </>
  )
}
