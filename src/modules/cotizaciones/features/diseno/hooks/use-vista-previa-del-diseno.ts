'use client'

import { parseAsStringLiteral, useQueryState } from 'nuqs'
import {
  ANCHO_AL_ABRIR,
  ANCHOS_DE_LA_VISTA_PREVIA,
  type AnchoDeLaVistaPrevia,
} from '../../../entities/diseno/anchos-de-la-vista-previa'

const CLAVE_DE_VISTA = 'vista'

// La vista previa del diseño en la URL (`?vista=412|1280|200`, 4.22-5): sin el parámetro, o con un valor desconocido, está cerrada. Recargar la deja como estaba; cambiar el ancho reemplaza
// la entrada del historial (no es una pantalla nueva) y no mueve el scroll.
export function useVistaPreviaDelDiseno() {
  const [ancho, poner] = useQueryState(
    CLAVE_DE_VISTA,
    parseAsStringLiteral(ANCHOS_DE_LA_VISTA_PREVIA).withOptions({
      history: 'replace',
      scroll: false,
    }),
  )
  return {
    ancho,
    abierta: ancho !== null,
    elegir: (nuevo: AnchoDeLaVistaPrevia) => {
      void poner(nuevo)
    },
    alternar: () => {
      void poner(ancho === null ? ANCHO_AL_ABRIR : null)
    },
  }
}
