'use client'

import { useCallback, useMemo, useState } from 'react'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import { formaDePlantilla, type Plantilla } from '../../../entities/plantilla/forma-de-plantilla'
import type { RechazoDePlantilla } from '../../../entities/plantilla/motivos-de-plantilla'
import {
  validarPlantilla,
  type ContextoDePlantilla,
} from '../../../entities/plantilla/validar-plantilla'

type Args = {
  origenId: string
  // El `actualizadoEn` del borrador leído, tal cual: la clave del borrador de estado es por versión.
  esperada: string | null
  // La plantilla de la que nace el editor (ya alineada con la fórmula) y la que hay guardada en el borrador (nula sin borrador).
  inicial: Plantilla
  guardada: Plantilla | null
  contexto: ContextoDePlantilla
}

type Valores = { plantilla: Plantilla }

// El estado del editor de la plantilla (4.19-3b): la plantilla de trabajo, la forma y la validación contra la fórmula, que corren al tipear, y el borrador en la pestaña.
// «Guardar» depende de `forma` y de que haya cambios; lo que sólo `completa` rechaza (grupos, tonos, nodos: lo cruza con la fórmula **publicar**) se dice arriba y no
// apaga nada.
export function useEditorDeLaPlantilla({ origenId, esperada, inicial, guardada, contexto }: Args) {
  const [plantilla, setPlantilla] = useState<Plantilla>(inicial)

  const forma = useMemo(() => validarPlantilla(plantilla, null), [plantilla])
  const completa = useMemo(() => validarPlantilla(plantilla, contexto), [plantilla, contexto])
  const rechazoDeForma: RechazoDePlantilla | null = forma.ok ? null : forma.error
  const rechazoParaPublicar: RechazoDePlantilla | null =
    forma.ok && !completa.ok ? completa.error : null
  // Sin borrador, «Guardar» está activo desde el principio: crea el borrador con lo que se ve.
  const hayCambios = useMemo(
    () => guardada === null || JSON.stringify(plantilla) !== JSON.stringify(guardada),
    [plantilla, guardada],
  )

  // «Guardar»: la forma pasa y hay qué guardar. `completa` no cuenta: lo que sólo ella rechaza se dice arriba.
  const puedeGuardar = rechazoDeForma === null && hayCambios

  const valores = useMemo<Valores>(() => ({ plantilla }), [plantilla])
  const base = useMemo<Valores>(() => ({ plantilla: inicial }), [inicial])
  const { limpiar } = useBorradorDeEstado<Valores>({
    clave: `tarjeta-editor:${origenId}:${esperada ?? 'nueva'}`,
    valores,
    guardado: base,
    alReponer: (cambios) => {
      // Sólo se acepta lo que todavía tiene la forma: lo demás (otra versión del formulario) no se repone.
      const repuesta = formaDePlantilla(cambios.plantilla)
      if (repuesta.ok) setPlantilla(repuesta.plantilla)
    },
  })

  const cambiar = useCallback((cambio: (antes: Plantilla) => Plantilla) => {
    setPlantilla(cambio)
  }, [])

  return {
    plantilla,
    cambiar,
    forma,
    rechazoDeForma,
    rechazoParaPublicar,
    hayCambios,
    puedeGuardar,
    limpiar,
  }
}

export type EditorDeLaPlantillaEstado = ReturnType<typeof useEditorDeLaPlantilla>
