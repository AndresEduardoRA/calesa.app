'use client'

import { useCallback, useEffect, useState } from 'react'
import { MENSAJE_INESPERADO, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { leerPaginaDeConversaciones } from '../../../composicion.client'
import type { PaginaDeConversaciones } from '../../../entities/conversaciones'

// La primera página de mis conversaciones, leída en el navegador al abrir el panel (el documento de la pantalla no la lleva). `null` mientras llega.
export function usePrimeraPagina() {
  const [pagina, setPagina] = useState<Resultado<PaginaDeConversaciones> | null>(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vigente = true
    void leerPaginaDeConversaciones({ tamano: TAMANO_DE_VER_MAS })
      .catch((): Resultado<PaginaDeConversaciones> => ({
        ok: false,
        error: { codigo: 'inesperado', mensaje: MENSAJE_INESPERADO },
      }))
      .then((lectura) => {
        if (vigente) {
          setPagina(lectura)
        }
      })
    return () => {
      vigente = false
    }
  }, [intento])

  const reintentar = useCallback(() => {
    setPagina(null)
    setIntento((n) => n + 1)
  }, [])

  return { pagina, reintentar }
}
