'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'

export const CLAVE_DE_FASE_ABIERTA = 'fase'
const PARAMETROS = { [CLAVE_DE_FASE_ABIERTA]: parseAsString }

// Qué fase está abierta en el inspector, en la URL (`?fase=<id>`): sobrevive a recargar y se puede compartir. Abrir suma al historial («atrás» lo cierra) y
// no pide nada al servidor (sin `shallow: false`: el inspector se dibuja con el flujo ya leído). `texto` es la URL tal cual; quien dibuja decide si es de una
// fase del flujo (un id ajeno se ignora). Tras recargar con el inspector abierto, «atrás» devuelve el foco a quien lo abrió (`vuelta-del-foco.ts`).
export function useFaseAbierta() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  const texto = parametros[CLAVE_DE_FASE_ABIERTA]
  useVueltaDelFoco(CLAVE_DE_FASE_ABIERTA, texto !== null)
  return {
    texto,
    abrir: (faseId: string) => {
      abrirConVuelta(
        CLAVE_DE_FASE_ABIERTA,
        () => setParametros({ [CLAVE_DE_FASE_ABIERTA]: faseId }, { history: 'push' }),
        texto === faseId,
      )
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_FASE_ABIERTA]: null })
    },
  }
}
