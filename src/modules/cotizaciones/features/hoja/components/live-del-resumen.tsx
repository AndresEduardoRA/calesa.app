'use client'

import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useLive } from '@/shared/ui/live'

// El Modo Live al alcance del resumen: quien cotiza le muestra el total a su cliente sin llegar a la barra de arriba (en el celular, con el resumen al pie). Es el mismo botón que
// el de la barra (`ConmutadorLive`, del marco): conmuta el mismo estado, la clase de `<html>`. Va aquí y no en `shared` porque mover el de la barra dispara el Nivel 2.
export function LiveDelResumen() {
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
