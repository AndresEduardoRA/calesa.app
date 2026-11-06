'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  CLAVE_DE_RESUMEN_DE_COTIZACION,
  idDelResumen,
} from '../../../entities/listado/resumen-del-listado'

const PARAMETROS = { [CLAVE_DE_RESUMEN_DE_COTIZACION]: parseAsString }

// Qué cotización está abierta en el resumen, en la URL (`?cotizacion=`): sobrevive a recargar y se puede compartir. Abrir suma al historial («atrás» lo cierra) y abrir la que ya está
// abierta no suma otra. Sin `shallow: false`: abrirlo no pide nada al servidor; el resumen se dibuja con la fila de la página. `texto` es la URL tal cual (abre el resumen aunque no sea
// un guid: dice «no disponible») e `id` es el guid en minúsculas, o null. Tras recargar con el resumen abierto, «atrás» devuelve el foco a quien lo abrió (`vuelta-del-foco.ts`).
export function useResumenDeCotizacion() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  const texto = parametros[CLAVE_DE_RESUMEN_DE_COTIZACION]
  const id = idDelResumen(texto)
  useVueltaDelFoco(CLAVE_DE_RESUMEN_DE_COTIZACION, texto !== null)
  return {
    texto,
    id,
    abrir: (cotizacionId: string) => {
      abrirConVuelta(
        CLAVE_DE_RESUMEN_DE_COTIZACION,
        () =>
          setParametros({ [CLAVE_DE_RESUMEN_DE_COTIZACION]: cotizacionId }, { history: 'push' }),
        id === idDelResumen(cotizacionId),
      )
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_RESUMEN_DE_COTIZACION]: null })
    },
  }
}
