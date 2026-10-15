'use client'

import { use, useEffect, useRef } from 'react'
import type { ClaveAtajo } from '@/shared/lib/atajos'
import { ContextoAtajos } from './proveedor-atajos'

// Registra qué hace un atajo mientras el componente está montado y `activo` es verdadero.
// `respaldo`: sólo responde si ningún otro registró ese atajo (el «nuevo» global del marco, que
// cede ante el «nuevo» de la pantalla aunque hidrate después).
// Fuera de <ProveedorAtajos> no hace nada: un componente suelto (un test, una pantalla de acceso)
// no se rompe por no tener atajos.
export function useAtajo(
  clave: ClaveAtajo,
  manejador: () => void,
  activo = true,
  { respaldo = false }: { respaldo?: boolean } = {},
): void {
  const registrar = use(ContextoAtajos)
  // El manejador cambia en cada render; el registro no tiene por qué rehacerse.
  const ultimo = useRef(manejador)
  useEffect(() => {
    ultimo.current = manejador
  }, [manejador])

  useEffect(() => {
    if (!registrar || !activo) {
      return
    }
    return registrar(
      clave,
      () => {
        ultimo.current()
      },
      respaldo,
    )
  }, [registrar, clave, activo, respaldo])
}
