'use client'

import { useRegional } from '@/shared/ui/regional'
import {
  leerNotasDeLaUnidad,
  NO_SE_LEYERON_LAS_NOTAS,
} from '../../../areas/mover/composicion.client'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { useEscribirNotas } from '../hooks/use-escribir-notas'
import { useListaDeLaUnidad } from '../hooks/use-lista-de-la-unidad'
import { CampoDeNota } from './campo-de-nota'
import { CuerpoDeLaLista } from './cuerpo-de-la-lista'
import { NotaDeLaUnidad } from './nota-de-la-unidad'

const SUSTANTIVO = { plural: 'notas', articulo: 'las' } as const

// El hueco «Notas» del panel de la unidad (6.04-2): arriba, escribir una nota; debajo, las notas, la más nueva primero, de a 20 con «Ver más» y «Ir a una fecha». Escribe quien ve la unidad
// (D22); editar es sólo de la propia y sin cambio de fase. Se lee al abrir el bloque, con la sesión de quien mira.
export function HuecoDeNotas({ unidad }: { unidad: Unidad }) {
  const { zonaHoraria } = useRegional()
  const lista = useListaDeLaUnidad(
    unidad,
    leerNotasDeLaUnidad,
    NO_SE_LEYERON_LAS_NOTAS,
    zonaHoraria,
  )
  const { crear, editar } = useEscribirNotas(unidad)
  return (
    <div className="grid gap-4" data-hueco="notas">
      <CampoDeNota etiqueta="Escribir una nota" textoDelBoton="Guardar nota" alGuardar={crear} />
      <CuerpoDeLaLista
        lista={lista}
        zona={zonaHoraria}
        cargando="Cargando las notas"
        vacio="Todavía no hay notas."
        sustantivo={SUSTANTIVO}
        fila={(nota) => <NotaDeLaUnidad nota={nota} zona={zonaHoraria} editar={editar} />}
      />
    </div>
  )
}
