'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import {
  CLAVE_DE_PESTANA,
  CLAVE_DE_RESUMEN,
  pestanaDelResumen,
  type PestanaDelResumen,
  pestanasDelResumen,
} from '../../../entities/resumen'
import { CLAVE_DE_EDICION } from '../../alta/claves'

const PARAMETROS = {
  [CLAVE_DE_RESUMEN]: parseAsString,
  [CLAVE_DE_PESTANA]: parseAsString,
  [CLAVE_DE_EDICION]: parseAsString,
}

// Qué vehículo está abierto en el resumen, en la URL (`?vehiculo=`), y en qué pestaña (`?pestana=`): sobrevive a recargar y se puede
// compartir. Abrir suma al historial («atrás» lo cierra) y empieza en «Resumen»; cambiar de pestaña no suma (así «atrás» cierra el
// resumen). Sin `shallow: false`: abrirlo no pide nada al servidor; el resumen se dibuja con la fila de la página y lee lo suyo por
// su cuenta. `editando` dice que el panel de edición está encima (`?editar=`): mientras tanto el resumen no vuelve a leer.
export function useResumenDeVehiculo(opciones: { verInteresados: boolean }) {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  const pestanas = pestanasDelResumen(opciones)
  return {
    id: parametros[CLAVE_DE_RESUMEN],
    pestana: pestanaDelResumen(parametros[CLAVE_DE_PESTANA], pestanas),
    pestanas,
    editando: parametros[CLAVE_DE_EDICION] !== null,
    abrir: (vehiculoId: string) => {
      void setParametros(
        { [CLAVE_DE_RESUMEN]: vehiculoId, [CLAVE_DE_PESTANA]: null },
        { history: 'push' },
      )
    },
    elegirPestana: (pestana: PestanaDelResumen) => {
      void setParametros({ [CLAVE_DE_PESTANA]: pestana === 'resumen' ? null : pestana })
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_RESUMEN]: null, [CLAVE_DE_PESTANA]: null })
    },
  }
}
