'use client'

import { useMemo } from 'react'
import type { CampoDeLayout, Categoria, OrigenResumen } from '@/modules/origenes/client'
import { useRegional } from '@/shared/ui/regional'
import { camposActivos } from '../../../entities/campo'
import { camposComunes } from '../../../entities/comunes'
import type { Fuentes } from '../../../entities/esquema'
import type { Vehiculo } from '../../../entities/vehiculo'

type Datos = {
  origen: OrigenResumen
  campos: readonly CampoDeLayout[]
  categorias: readonly Categoria[]
  vehiculo: Vehiculo | null
}

// Lo que el formulario necesita para validar: los datos comunes del origen, sus campos activos, las
// categorías y la zona de la empresa; en una edición, lo que el vehículo ya tiene guardado.
export function useFuentesDelPanel({ origen, campos, categorias, vehiculo }: Datos) {
  const { zonaHoraria } = useRegional()
  const activos = useMemo(() => camposActivos(campos), [campos])
  const fuentes = useMemo<Fuentes>(
    () => ({
      comunes: camposComunes(origen.tipo),
      campos: activos,
      categorias,
      zona: zonaHoraria,
      ...(vehiculo
        ? { actuales: { atributos: vehiculo.atributos, categoriaId: vehiculo.categoriaId } }
        : {}),
    }),
    [origen.tipo, activos, categorias, zonaHoraria, vehiculo],
  )
  return { activos, fuentes }
}
