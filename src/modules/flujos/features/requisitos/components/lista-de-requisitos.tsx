'use client'

import type { RequisitoParaConfigurar } from '../../../entities/flujo'
import { destinoDeRequisito } from '../../../entities/requisitos/vista-de-fase'
import type { RequisitosDeLaFase } from '../hooks/use-requisitos-de-la-fase'
import { FilaDeRequisito } from './fila-de-requisito'

type Props = {
  requisitos: RequisitosDeLaFase
  prefijo: string
  alCambiarBloqueo: (requisito: RequisitoParaConfigurar, valor: boolean) => void
  alEditar: (id: string) => void
  alPedirQuitar: (id: string) => void
}

// Los requisitos de la fase en su orden, una fila cada uno. Nada de estado: lo que se les hace lo decide el bloque.
export function ListaDeRequisitos({
  requisitos: r,
  prefijo,
  alCambiarBloqueo,
  alEditar,
  alPedirQuitar,
}: Props) {
  if (r.requisitos.length === 0) {
    return null
  }
  return (
    <ul className="grid gap-1.5" aria-label="Requisitos de la fase">
      {r.requisitos.map((requisito) => (
        <FilaDeRequisito
          key={requisito.id}
          requisito={requisito}
          descripcion={r.describir(requisito)}
          prefijo={prefijo}
          puedeSubir={destinoDeRequisito(r.requisitos, requisito.id, 'subir') !== null}
          puedeBajar={destinoDeRequisito(r.requisitos, requisito.id, 'bajar') !== null}
          alMover={(direccion) => void r.mover(requisito, direccion)}
          alCambiarBloqueo={(valor) => {
            alCambiarBloqueo(requisito, valor)
          }}
          escribiendo={r.enCurso}
          alEditar={() => {
            alEditar(requisito.id)
          }}
          alPedirQuitar={() => {
            alPedirQuitar(requisito.id)
          }}
        />
      ))}
    </ul>
  )
}
