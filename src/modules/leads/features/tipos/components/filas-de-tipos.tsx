'use client'

import {
  destinoDeTipo,
  esElUnicoActivoDeSuClase,
  motivoParaNoDesactivar,
  motivoParaNoEliminar,
} from '../../../entities/tipo-de-lead'
import type { TiposDeLead } from '../hooks/use-tipos-de-lead'
import { FilaDeTipo } from './fila-de-tipo'

type Props = {
  tipos: TiposDeLead
  alEditar: (id: string) => void
  alPedirEliminar: (id: string) => void
}

// Las filas de los tipos, en su orden. Cada una dice sola si es el último activo de su clase.
export function FilasDeTipos({ tipos: lista, alEditar, alPedirEliminar }: Props) {
  const { tipos, lista: datos } = lista
  return (
    <>
      <ul className="grid divide-y divide-(--color-line) overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
        {tipos.map((tipo) => (
          <FilaDeTipo
            key={tipo.id}
            tipo={tipo}
            unicoActivo={esElUnicoActivoDeSuClase(tipos, tipo)}
            motivoNoDesactivar={motivoParaNoDesactivar(tipos, tipo)}
            motivoNoEliminar={motivoParaNoEliminar(tipos, tipo)}
            puedeSubir={destinoDeTipo(tipos, tipo.id, 'subir') !== null}
            puedeBajar={destinoDeTipo(tipos, tipo.id, 'bajar') !== null}
            alActivar={(activo) => void lista.activar(tipo, activo)}
            alMover={(direccion) => void lista.mover(tipo, direccion)}
            alEditar={() => {
              alEditar(tipo.id)
            }}
            alPedirEliminar={() => {
              alPedirEliminar(tipo.id)
            }}
          />
        ))}
      </ul>
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        {tipos.length} de {datos.tope} tipos posibles.
      </p>
    </>
  )
}
