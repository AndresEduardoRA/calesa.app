'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { useEffect, useMemo } from 'react'
import { recordarQuienAbre } from '@/shared/ui/foco-de-quien-abre'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { claveDeReferencia, referenciaDeUrl, type Referencia } from '../../../entities/menciones'

// `?mencion=<clase>:<id>`: qué mención está abierta en el drawer. No nombra `c` ni `panel`: abrirla o cerrarla no toca la conversación abierta.
// Abrir suma al historial («atrás» la cierra) y recargar la mantiene. Un valor ilegible se limpia en silencio.
export const CLAVE_DE_MENCION = 'mencion'

export function useMencionPorUrl() {
  const [valor, setValor] = useQueryState(CLAVE_DE_MENCION, parseAsString)
  // La persona no abre nada (7.10-1, D4): `usuario:<id>` en la URL es tan ilegible como un valor roto. Memorizada por el texto de la URL: quien la
  // lee (`useReferenciasDelHilo`) no vuelve a pedirla en cada dibujo.
  const referencia = useMemo(() => {
    const leida = referenciaDeUrl(valor)
    return leida !== null && leida.clase !== 'usuario' ? leida : null
  }, [valor])
  const ilegible = valor !== null && referencia === null
  useVueltaDelFoco(CLAVE_DE_MENCION, referencia !== null)
  useEffect(() => {
    if (ilegible) {
      void setValor(null)
    }
  }, [ilegible, setValor])
  return {
    referencia,
    abrir: (abierta: Referencia) => {
      recordarQuienAbre()
      const clave = claveDeReferencia(abierta)
      abrirConVuelta(CLAVE_DE_MENCION, () => setValor(clave, { history: 'push' }), valor === clave)
    },
    cerrar: () => {
      void setValor(null)
    },
  }
}
