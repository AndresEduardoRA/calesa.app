'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { ValorDeCatalogo } from '../../../entities/catalogos/catalogo'
import {
  CLAVE_DE_VALOR,
  MENSAJE_VALOR_YA_NO_ESTA,
  PANEL_ELIMINAR_VALOR,
} from '../../../entities/catalogos/paneles'

// La confirmación de eliminar un valor en la URL (`?panel=eliminar-valor&valor=<id>`): se puede recargar y «atrás» la cierra. Uno que ya no está no abre (se
// avisa y la URL se limpia, una vez); mientras se va, el diálogo conserva el último que vio.
export function useEliminarValorPorUrl(valores: readonly ValorDeCatalogo[]) {
  const url = usePanelPorUrl(PANEL_ELIMINAR_VALOR, [CLAVE_DE_VALOR])
  const id = url.valor(CLAVE_DE_VALOR)
  const apertura = useApertura(url.abierto)
  const encontrado = valores.find((v) => v.id === id) ?? null
  const rechazado = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${id ?? ''}` : null,
    url.abierto && encontrado === null ? MENSAJE_VALOR_YA_NO_ESTA : null,
    url.cerrar,
  )
  const valor = useUltimo(url.abierto && !rechazado ? encontrado : null)
  return {
    abierto: url.abierto && !rechazado && encontrado !== null,
    valor,
    abrir: (valorId: string) => {
      url.abrir({ [CLAVE_DE_VALOR]: valorId })
    },
    cerrar: url.cerrar,
  }
}
