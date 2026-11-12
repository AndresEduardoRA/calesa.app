'use client'

import { useId } from 'react'
import { atajoDe } from '@/shared/lib/atajos'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { MOTIVO_DE_NOTA_OBLIGATORIA } from '@/modules/flujos/client'
import { textoDelBotonDelLote } from '../lote/vista-del-lote'

type Props = {
  nota: string
  pideNota: boolean
  escribirNota: (texto: string) => void
  // Cuántas unidades se mueven al enviar.
  cuantas: number
  motivo: string | null
  enCurso: boolean
  fallo: string | null
  alEnviar: () => void
}

// La nota común y el botón del lote (6.04-3): obligatoria si la fase o la salida la piden de cualquiera (dicho junto al campo, no sólo en el botón). Ctrl/Cmd+Enter envía cuando el botón está
// habilitado. Apagado, el motivo va escrito debajo.
export function FormularioDelLote({
  nota,
  pideNota,
  escribirNota,
  cuantas,
  motivo,
  enCurso,
  fallo,
  alEnviar,
}: Props) {
  const id = useId()
  const idMotivo = `${id}-motivo`
  return (
    <form
      className="grid gap-3"
      aria-busy={enCurso}
      data-formulario="lote"
      onSubmit={(evento) => {
        evento.preventDefault()
        alEnviar()
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-nota`}>
          {pideNota ? 'Nota interna común (obligatoria)' : 'Nota interna común (opcional)'}
        </Label>
        <Textarea
          id={`${id}-nota`}
          name="nota"
          value={nota}
          aria-describedby={pideNota ? `${id}-ayuda` : undefined}
          onChange={(evento) => {
            escribirNota(evento.target.value)
          }}
          onKeyDown={(evento) => {
            if (atajoDe(evento.nativeEvent) === 'guardarYSeguir') {
              evento.preventDefault()
              alEnviar()
            }
          }}
        />
        {pideNota ? (
          <p id={`${id}-ayuda`} className="text-(length:--text-sm) text-(--color-ink-soft)">
            {MOTIVO_DE_NOTA_OBLIGATORIA}
          </p>
        ) : null}
      </div>
      {fallo ? (
        <Aviso tono="peligro">
          <p>{fallo}</p>
        </Aviso>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          className="min-h-11 md:min-h-9"
          disabled={motivo !== null || enCurso}
          aria-describedby={motivo === null ? undefined : idMotivo}
        >
          {textoDelBotonDelLote(cuantas)}
        </Button>
      </div>
      {motivo === null ? null : (
        <p
          id={idMotivo}
          data-motivo-del-boton
          className="text-(length:--text-sm) text-(--color-ink-soft)"
        >
          {motivo}
        </p>
      )}
    </form>
  )
}
