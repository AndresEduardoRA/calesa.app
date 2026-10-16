'use client'

import { useMemo, type Dispatch, type SetStateAction } from 'react'
import type { ValoresDeFormulario } from '@/shared/lib/campos'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import type { ValoresDelSeguimiento } from '../../../entities/seguimiento'
import { conValoresRepuestos } from '../../../entities/seguimiento-nuevo'
import { conBorradorRepuesto, type Estado } from './estado-del-alta'

type Args = {
  estado: Estado
  setEstado: Dispatch<SetStateAction<Estado>>
  // Con lo que arranca el formulario de los datos y el del primer seguimiento: lo que no difiere de eso
  // no se guarda.
  iniciales: ValoresDeFormulario
  seguimientoInicial: ValoresDelSeguimiento
  // Los tipos de seguimiento activos: un borrador con uno que se apagó no lo repone.
  tiposActivos: readonly string[]
  activo: boolean
}

// Un solo borrador (y un solo «Recuperamos lo que habías escrito») para todo «Nuevo lead»: los datos del
// lead y, bajo la clave `seguimiento`, el primer seguimiento con su detalle como documento. Al reponerlo,
// el documento pasa otra vez por la lista blanca.
export function useBorradorDelAlta({
  estado,
  setEstado,
  iniciales,
  seguimientoInicial,
  tiposActivos,
  activo,
}: Args) {
  const escrito = useMemo(
    () => ({ ...estado.valores, seguimiento: estado.seguimiento }),
    [estado.valores, estado.seguimiento],
  )
  const guardado = useMemo(
    () => ({ ...iniciales, seguimiento: seguimientoInicial }),
    [iniciales, seguimientoInicial],
  )
  return useBorradorDeEstado({
    clave: 'lead-nuevo',
    valores: escrito,
    guardado,
    alReponer: (cambios) => {
      const { seguimiento, ...datos } = cambios as Partial<typeof escrito>
      setEstado((antes) =>
        conBorradorRepuesto(
          antes,
          datos,
          seguimiento ? conValoresRepuestos(antes.seguimiento, seguimiento, tiposActivos) : null,
        ),
      )
    },
    activo,
  })
}
