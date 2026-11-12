'use client'

import type { EntradaDeLaBandeja, Rechazado } from '../hooks/use-bandeja'
import { FilaDeLaBandeja } from './fila-de-la-bandeja'

type Props = {
  entran: readonly EntradaDeLaBandeja[]
  // Lo que el tipo elegido no admite: sigue en la bandeja pero no se sube.
  fuera: readonly { entrada: EntradaDeLaBandeja; motivo: string }[]
  // Lo que no entró al elegirlo (formato, peso, repetido, de más).
  rechazados: readonly Rechazado[]
  fallos: Readonly<Record<string, string>>
  deshabilitado: boolean
  alQuitar: (hash: string) => void
}

// La bandeja: lo que se va a subir, lo que el tipo no admite y lo que no entró, cada uno con su porqué. Nada se subió todavía.
export function Bandeja({ entran, fuera, rechazados, fallos, deshabilitado, alQuitar }: Props) {
  if (entran.length === 0 && fuera.length === 0 && rechazados.length === 0) {
    return null
  }
  return (
    <div className="grid gap-2" data-bandeja-de-documentos>
      {entran.length > 0 ? (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2" aria-label="Archivos para subir">
          {entran.map((e) => (
            <FilaDeLaBandeja
              key={e.datos.hash}
              entrada={e}
              motivo={fallos[e.datos.hash]}
              deshabilitado={deshabilitado}
              alQuitar={() => {
                alQuitar(e.datos.hash)
              }}
            />
          ))}
        </ul>
      ) : null}
      {fuera.length > 0 || rechazados.length > 0 ? (
        <ul
          className="grid gap-1 text-(length:--text-sm) text-(--color-peligro-ink)"
          aria-label="Archivos que no se pueden subir"
        >
          {fuera.map(({ entrada, motivo }) => (
            <li key={entrada.datos.hash} className="break-words">
              <span className="font-medium">{entrada.datos.nombre}</span>: {motivo}{' '}
              <button
                type="button"
                className="underline"
                disabled={deshabilitado}
                onClick={() => {
                  alQuitar(entrada.datos.hash)
                }}
              >
                Quitar
              </button>
            </li>
          ))}
          {rechazados.map((r) => (
            <li key={r.clave} className="break-words">
              <span className="font-medium">{r.nombre}</span>: {r.motivo}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
