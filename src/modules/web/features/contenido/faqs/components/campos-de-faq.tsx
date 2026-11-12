'use client'

import { useId } from 'react'
import { Campo } from '@/shared/ui/campo'
import { Interruptor } from '@/shared/ui/interruptor'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import {
  LARGO_DE_CATEGORIA,
  LARGO_DE_PREGUNTA,
  LARGO_DE_RESPUESTA,
} from '../../../../entities/contenido/faqs'
import type { useFormularioDeFaq } from '../hooks/use-formulario-de-faq'

type Props = {
  formulario: ReturnType<typeof useFormularioDeFaq>
  // Las categorías ya usadas: las sugerencias del campo.
  categorias: readonly string[]
}

// Los campos de una pregunta frecuente: pregunta, respuesta (texto plano), categoría con sugerencias y si está publicada.
export function CamposDeFaq({ formulario: f, categorias }: Props) {
  const idDeRespuesta = useId()
  const idDeSugerencias = useId()
  return (
    <>
      <Campo
        nombre="pregunta"
        etiqueta="Pregunta"
        autoComplete="off"
        maxLength={LARGO_DE_PREGUNTA + 20}
        value={f.valores.pregunta}
        error={f.errores['pregunta']}
        onChange={(evento) => {
          f.cambiar({ pregunta: evento.target.value })
        }}
      />
      <div className="grid gap-1.5">
        <Label htmlFor={idDeRespuesta}>Respuesta</Label>
        <Textarea
          id={idDeRespuesta}
          name="respuesta"
          rows={6}
          maxLength={LARGO_DE_RESPUESTA + 100}
          value={f.valores.respuesta}
          aria-invalid={f.errores['respuesta'] ? true : undefined}
          aria-describedby={`${idDeRespuesta}-ayuda`}
          onChange={(evento) => {
            f.cambiar({ respuesta: evento.target.value })
          }}
        />
        {f.errores['respuesta'] ? (
          <p className="text-(length:--text-sm) text-(--color-peligro-ink)">
            {f.errores['respuesta']}
          </p>
        ) : null}
        <p
          id={`${idDeRespuesta}-ayuda`}
          className="text-(length:--text-sm) text-(--color-ink-faint)"
        >
          Se muestra tal como la escribes, sin formato.
        </p>
      </div>
      <Campo
        nombre="categoria"
        etiqueta="Categoría (opcional)"
        autoComplete="off"
        list={idDeSugerencias}
        maxLength={LARGO_DE_CATEGORIA + 20}
        value={f.valores.categoria}
        error={f.errores['categoria']}
        ayuda="Escribe una nueva o elige una que ya uses."
        onChange={(evento) => {
          f.cambiar({ categoria: evento.target.value })
        }}
      />
      <datalist id={idDeSugerencias}>
        {categorias.map((categoria) => (
          <option key={categoria} value={categoria} />
        ))}
      </datalist>
      <Interruptor
        titulo="Publicada"
        ayuda="Una pregunta publicada se ve en la web pública. Una nueva nace sin publicar."
        valor={f.valores.publicada}
        alCambiar={(publicada) => {
          f.cambiar({ publicada })
        }}
      />
    </>
  )
}
