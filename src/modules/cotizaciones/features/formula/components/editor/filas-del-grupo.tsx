'use client'

import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'

// Una fila que puede sumar a un grupo, con la etiqueta del grupo donde está (nula si no tiene).
export type FilaCandidata = { id: string; etiqueta: string; grupo: string | null }
export type FilaDelGrupo = { id: string; etiqueta: string }

type Props = {
  uid: string
  // Las filas del grupo al abrir el formulario y las que quedan ahora, en el orden de la fórmula.
  originales: readonly FilaDelGrupo[]
  quedan: readonly FilaDelGrupo[]
  // Las filas que pueden sumar y no están en el grupo.
  candidatas: readonly FilaCandidata[]
  error: string | undefined
  alQuitar: (id: string) => void
  alSumar: (id: string) => void
}

const SIN_GRUPO = 'Sin grupo, una fila no entra en el total.'

const opcionDe = (f: FilaCandidata) =>
  `${f.etiqueta} (${f.id}) · ${f.grupo === null ? 'sin grupo' : `en ${f.grupo}`}`

// «Sumar una fila»: el selector de las que pueden sumar y no están en el grupo, y su error.
function SumarUnaFila({
  uid,
  candidatas,
  error,
  alSumar,
}: Pick<Props, 'uid' | 'candidatas' | 'error' | 'alSumar'>) {
  const [elegida, setElegida] = useState('')
  const seleccion = candidatas.some((f) => f.id === elegida) ? elegida : (candidatas[0]?.id ?? '')
  const idDelError = `${uid}-miembros-error`
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`${uid}-miembros`}>Sumar una fila</Label>
      <div className="flex min-w-0 flex-wrap gap-2">
        <select
          id={`${uid}-miembros`}
          className="h-11 min-w-0 flex-1 rounded-lg border border-(--color-line-strong) bg-(--color-surface) px-2.5 text-(length:--text-base) text-(--color-ink) outline-none focus-visible:shadow-(--shadow-focus) disabled:opacity-50 aria-invalid:border-(--color-peligro) md:h-9 md:text-(length:--text-sm)"
          value={seleccion}
          disabled={candidatas.length === 0}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idDelError : undefined}
          onChange={(evento) => {
            setElegida(evento.target.value)
          }}
        >
          {candidatas.length === 0 ? (
            <option value="">No hay otra fila que pueda sumar</option>
          ) : null}
          {candidatas.map((f) => (
            <option key={f.id} value={f.id}>
              {opcionDe(f)}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          disabled={seleccion === ''}
          onClick={() => {
            if (seleccion !== '') alSumar(seleccion)
          }}
        >
          Sumar
        </Button>
      </div>
      {error ? (
        <p id={idDelError} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
    </div>
  )
}

// «Filas del grupo» y «Sumar una fila» en el formulario de un grupo (4.21-3c, C4, P3 y P4): cada fila con «Quitar»; las quitadas, con que sin grupo no entran en el total;
// y un selector de las filas que pueden sumar (un monto, sin salida). Se aplica con el «Aplicar» del grupo.
export function FilasDelGrupo({
  uid,
  originales,
  quedan,
  candidatas,
  error,
  alQuitar,
  alSumar,
}: Props) {
  const quedanIds = new Set(quedan.map((f) => f.id))
  const quitadas = originales.filter((f) => !quedanIds.has(f.id))
  return (
    <fieldset className="grid min-w-0 gap-2">
      <legend className="mb-1 text-(length:--text-sm) font-medium text-(--color-ink)">
        Filas del grupo
      </legend>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
        {quedan.map((f) => (
          <li key={f.id} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="break-words text-(--color-ink)">{f.etiqueta}</span>
            <code className="break-all text-(--color-ink-soft)">{f.id}</code>
            <Button
              type="button"
              variant="outline"
              className="ml-auto min-h-11 md:min-h-9"
              aria-label={`Quitar ${f.etiqueta} del grupo`}
              onClick={() => {
                alQuitar(f.id)
              }}
            >
              Quitar
            </Button>
          </li>
        ))}
      </ul>
      {quitadas.map((f) => (
        <p key={f.id} className="text-(--color-ink-soft)">
          Queda sin grupo «{f.etiqueta}». {SIN_GRUPO}
        </p>
      ))}
      <SumarUnaFila uid={uid} candidatas={candidatas} error={error} alSumar={alSumar} />
    </fieldset>
  )
}
