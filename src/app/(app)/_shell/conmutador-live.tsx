'use client'

import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useLive } from '@/shared/ui/live'

// Modo Live: para mostrarle la pantalla a un cliente. Oculta toda cifra de dinero y su símbolo
// de moneda, en toda la app.
export function ConmutadorLive() {
  const { live, alternar } = useLive()

  return (
    <Button
      variant={live ? 'secondary' : 'ghost'}
      size="icon-lg"
      className="size-[44px] md:size-9"
      aria-pressed={live}
      aria-label="Modo Live: ocultar los montos"
      title={
        live ? 'Modo Live encendido: los montos están ocultos' : 'Modo Live: ocultar los montos'
      }
      onClick={alternar}
    >
      {live ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
    </Button>
  )
}
