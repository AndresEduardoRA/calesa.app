'use client'

import { Campo } from '@/shared/ui/campo'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import type { useFormularioDeDeclaracion } from '../hooks/use-formulario-de-declaracion'

type Formulario = ReturnType<typeof useFormularioDeDeclaracion>

function CampoDeTexto({
  clave,
  etiqueta,
  formulario: f,
  type,
}: {
  clave: 'numero' | 'aceptadaEl' | 'venceTributosEl' | 'despachante' | 'deposito'
  etiqueta: string
  formulario: Formulario
  type?: 'date'
}) {
  return (
    <Campo
      nombre={`declaracion-${clave}`}
      etiqueta={etiqueta}
      type={type}
      autoComplete="off"
      value={f.valores[clave]}
      onChange={(evento) => {
        f.escribir({ [clave]: evento.target.value })
      }}
      error={f.errores[clave]}
      disabled={f.enCurso}
    />
  )
}

// Los campos de una declaración: el número (obligatorio), las dos fechas, el despachante, el depósito y las notas. El canal no se elige acá: se asigna aparte y fija la composición.
export function CamposDeDeclaracion({ formulario: f }: { formulario: Formulario }) {
  return (
    <>
      <CampoDeTexto clave="numero" etiqueta="Número" formulario={f} />
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoDeTexto clave="aceptadaEl" etiqueta="Aceptada el" type="date" formulario={f} />
        <CampoDeTexto
          clave="venceTributosEl"
          etiqueta="Vencen los tributos el"
          type="date"
          formulario={f}
        />
      </div>
      <CampoDeTexto clave="despachante" etiqueta="Despachante" formulario={f} />
      <CampoDeTexto clave="deposito" etiqueta="Depósito" formulario={f} />
      <div className="grid gap-1.5">
        <Label htmlFor="declaracion-notas">Notas</Label>
        <Textarea
          id="declaracion-notas"
          name="declaracion-notas"
          value={f.valores.notas}
          aria-invalid={f.errores['notas'] ? true : undefined}
          onChange={(evento) => {
            f.escribir({ notas: evento.target.value })
          }}
          disabled={f.enCurso}
        />
        {f.errores['notas'] ? (
          <p className="text-(length:--text-sm) text-(--color-peligro-ink)">{f.errores['notas']}</p>
        ) : null}
      </div>
    </>
  )
}
