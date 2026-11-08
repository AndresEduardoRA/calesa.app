'use client'

import { useCallback, useMemo, useState } from 'react'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import type { Diseno } from '../../../entities/diseno'
import { nodosPorId } from '../../../entities/diseno/admite-nivel'
import { avisosDeDeduccion } from '../../../entities/diseno/aviso-de-deduccion'
import { deduccionesDelDiseno } from '../../../entities/diseno/deduccion'
import {
  contextoDelEditor,
  ponerAncho,
  ponerSeccion,
  type DisenoParaEditar,
  type NivelDelDiseno,
} from '../../../entities/diseno/edicion-del-diseno'
import { ponerNiveles, type CambioDeNiveles } from '../../../entities/diseno/niveles'
import { validarDiseno } from '../../../entities/validar-diseno'
import { useGuardadoDelDiseno } from './use-guardar-diseno'

type Args = {
  origenId: string
  leida: DisenoParaEditar
  // El diseño que se edita (el que la pantalla ya sabe que existe).
  disenoLeido: Diseno
  niveles: readonly NivelDelDiseno[]
}

// El estado de la pestaña «Diseño» (4.22-2): el diseño de trabajo, que cambia sólo por las operaciones puras de `edicion-del-diseno.ts` y `niveles.ts`; lo que
// `validarDiseno()` rechaza tras cada cambio (queda aplicado y se dice, no apaga «Guardar»); el aviso «se deduce restando»; y el guardado.
export function useEditorDelDiseno({ origenId, leida, disenoLeido, niveles }: Args) {
  const envio = useUnEnvioALaVez()
  const [trabajo, setTrabajo] = useState<Diseno>(disenoLeido)
  const { definicion } = leida

  const nodos = useMemo(() => nodosPorId(definicion), [definicion])
  const nombresDeNodos = useMemo(
    () => new Map(definicion.nodos.map((n) => [n.id, n.etiqueta])),
    [definicion],
  )
  const nombresDeNiveles = useMemo(
    () => new Map(niveles.map((n) => [n.clave, n.nombre])),
    [niveles],
  )
  const contexto = useMemo(() => contextoDelEditor(definicion, niveles), [definicion, niveles])

  // Una vez por cambio: la revisión de la base en espejo y el aviso.
  const rechazo = useMemo(() => {
    const r = validarDiseno(definicion, trabajo, contexto)
    if (r.ok) return null
    const { mensaje, donde } = r.error
    const titulo =
      donde === undefined ? undefined : trabajo.secciones.find((s) => s.id === donde)?.titulo
    const legible = donde === undefined ? null : (titulo ?? nombresDeNodos.get(donde) ?? donde)
    return { mensaje, donde: legible }
  }, [definicion, trabajo, contexto, nombresDeNodos])
  const avisos = useMemo(
    () =>
      avisosDeDeduccion(deduccionesDelDiseno(definicion, trabajo), {
        nodos: nombresDeNodos,
        niveles: nombresDeNiveles,
      }),
    [definicion, trabajo, nombresDeNodos, nombresDeNiveles],
  )

  const aplicar = useCallback((cambio: (d: Diseno) => Diseno) => {
    setTrabajo(cambio)
  }, [])

  const guardado = useGuardadoDelDiseno({
    origenId,
    leida,
    disenoLeido,
    trabajo,
    envio,
    alReemplazar: setTrabajo,
  })

  return {
    trabajo,
    nodos,
    nombresDeNodos,
    rechazo,
    avisos,
    guardado,
    // Mientras guarda, nada cambia.
    ocupado: envio.enCurso,
    // Aplica una operación pura sobre el diseño de trabajo (las de ítems, cabecera y tarjeta: `use-ediciones-del-diseno.ts`).
    aplicar,
    ponerSeccion: (seccionId: string, cambios: Parameters<typeof ponerSeccion>[2]) => {
      setTrabajo((d) => ponerSeccion(d, seccionId, cambios))
    },
    ponerAncho: (seccionId: string, nodoId: string, ancho: Parameters<typeof ponerAncho>[3]) => {
      setTrabajo((d) => ponerAncho(d, seccionId, nodoId, ancho))
    },
    ponerNiveles: (seccionId: string, nodoId: string | undefined, cambios: CambioDeNiveles) => {
      setTrabajo((d) =>
        ponerNiveles(
          d,
          nodoId === undefined ? { seccion: seccionId } : { seccion: seccionId, nodo: nodoId },
          cambios,
        ),
      )
    },
  }
}
