'use client'

import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from './button'

// Alterna claro / oscuro. Los dos íconos están siempre en el DOM y los muestra el CSS según la
// clase `.dark`: así el servidor y el cliente renderizan lo mismo y no hay salto al hidratar.
export function ConmutadorTema() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Cambiar entre tema claro y oscuro"
      onClick={() => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
      }}
    >
      <SunIcon className="dark:hidden" aria-hidden />
      <MoonIcon className="hidden dark:block" aria-hidden />
    </Button>
  )
}
