'use client'

import { enElTope } from '@/shared/lib/paginacion'
import { Button } from '@/shared/ui/button'
import { estadoDelRecordatorio, type Recordatorio } from '../../../entities/recordatorios'
import type { Recordatorios } from '../hooks/use-recordatorios'
import { ItemDeRecordatorio } from './item-de-recordatorio'

type Props = {
  lista: readonly Recordatorio[]
  hayMas: boolean
  ahora: string
  zona: string
  recordatorios: Recordatorios
  alEditar: (id: string) => void
  verMas: () => void
  cargandoMas: boolean
  // Lo que se dice al llegar al tope de lo cargado (en vez de «Ver más»).
  textoDelTope: string
}

// Una de las dos listas (pendientes o completados) con «Ver más» hasta el tope. Cada ítem fuera de la
// vista no se dibuja (`content-visibility`): cargar 500 no cuesta 500 dibujos.
export function ListaDeRecordatorios({
  lista,
  hayMas,
  ahora,
  zona,
  recordatorios,
  alEditar,
  verMas,
  cargandoMas,
  textoDelTope,
}: Props) {
  return (
    <>
      <ul className="grid gap-2">
        {lista.map((r) => (
          <li key={r.id} className="[contain-intrinsic-size:auto_5rem] [content-visibility:auto]">
            <ItemDeRecordatorio
              recordatorio={r}
              estado={estadoDelRecordatorio(r, ahora)}
              zona={zona}
              enCurso={recordatorios.enCurso}
              alCompletar={(completado) => void recordatorios.completar(r, completado)}
              alEditar={() => {
                alEditar(r.id)
              }}
              alEliminar={() => void recordatorios.eliminar(r)}
            />
          </li>
        ))}
      </ul>
      {hayMas && enElTope(lista) ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          {textoDelTope}
        </p>
      ) : hayMas ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-fit md:min-h-8"
          onClick={verMas}
          disabled={cargandoMas}
        >
          {cargandoMas ? 'Cargando…' : 'Ver más'}
        </Button>
      ) : null}
    </>
  )
}
