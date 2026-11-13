'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { CLAVE_DE_CAMBIO, idDelCambio } from '../../../entities/actividad'

const PARAMETROS = { [CLAVE_DE_CAMBIO]: parseAsString }

// Qué cambio está abierto en su drawer, en la URL (`?cambio=<id>`): sobrevive a recargar y se puede compartir. Abrir suma al historial
// («atrás» lo cierra) y no va al servidor: el diff se lee desde el navegador. `texto` es la URL tal cual (abre el drawer aunque no sea un id:
// dice «sin acceso») e `id`, el número o nulo.
export function useCambioAbierto() {
  const [parametros, setParametros] = useQueryStates(PARAMETROS)
  const texto = parametros[CLAVE_DE_CAMBIO]
  const id = idDelCambio(texto)
  const abierto = texto !== null
  useVueltaDelFoco(CLAVE_DE_CAMBIO, abierto)
  return {
    texto,
    id,
    abierto,
    abrir: (cambioId: number) => {
      abrirConVuelta(
        CLAVE_DE_CAMBIO,
        () => setParametros({ [CLAVE_DE_CAMBIO]: String(cambioId) }, { history: 'push' }),
        id === cambioId,
      )
    },
    cerrar: () => {
      void setParametros({ [CLAVE_DE_CAMBIO]: null })
    },
  }
}
