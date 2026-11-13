'use client'

import { DropdownMenuItem, DropdownMenuSeparator } from './dropdown-menu'
import { avisar } from './toasts'
import { useInstalacion } from './use-instalacion'

const INSTRUCCIONES_IOS = 'Para instalar la app, toca Compartir y luego «Agregar a inicio».'

// «Instalar la app» en el menú del usuario. No aparece si la app ya corre instalada ni si el
// navegador no instala. En iOS no hay aviso nativo: se explica el camino por «Compartir».
export function InstalarApp({ className }: { className?: string }) {
  const { oferta, instalar } = useInstalacion()
  if (oferta === 'ninguna') return null

  return (
    <>
      <DropdownMenuItem
        className={className}
        onClick={() => {
          if (oferta === 'prompt') void instalar()
          else avisar(INSTRUCCIONES_IOS)
        }}
      >
        Instalar la app
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
  )
}
