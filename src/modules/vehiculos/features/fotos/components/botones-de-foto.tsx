import { ArrowLeftIcon, ArrowRightIcon, StarIcon, Trash2Icon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/shared/ui/button'
import type { Direccion, Foto } from '../../../entities/foto'

export type AccionesDeFoto = {
  alMover: (direccion: Direccion) => void
  alPonerDePortada: () => void
  alEliminar: () => void
}

type Props = {
  foto: Foto
  esPrimera: boolean
  esUltima: boolean
  acciones: AccionesDeFoto
  ocupado: boolean
  // Después de moverla, el foco vuelve al botón con que se la movió.
  enfocar: Direccion | null
}

// 44 px donde se toca, 32 con mouse.
const BOTON = 'size-11 md:size-8'

// Lo que se puede hacer con una foto guardada. Los que no aplican (mover la primera hacia
// atrás, poner de portada la que ya lo es) quedan apagados, con el porqué.
export function BotonesDeFoto({ foto, esPrimera, esUltima, acciones, ocupado, enfocar }: Props) {
  const antes = useRef<HTMLButtonElement>(null)
  const despues = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!enfocar || ocupado) {
      return
    }
    // En un borde, el botón con que se la movió quedó apagado: el foco va al otro.
    const preferido = enfocar === 'antes' ? antes.current : despues.current
    const otro = enfocar === 'antes' ? despues.current : antes.current
    ;(preferido?.disabled ? otro : preferido)?.focus()
  }, [enfocar, ocupado, foto.orden])

  return (
    // En un celular angosto los cuatro botones de 44 px no entran en una fila: pasan a dos.
    <div className="flex flex-wrap items-center justify-between gap-1">
      <div className="flex">
        <Button
          ref={antes}
          type="button"
          variant="ghost"
          size="icon"
          className={BOTON}
          aria-label={`Mover la foto ${foto.orden} antes`}
          aria-keyshortcuts="Alt+ArrowLeft"
          title={esPrimera ? 'Ya es la primera' : undefined}
          disabled={ocupado || esPrimera}
          onClick={() => {
            acciones.alMover('antes')
          }}
        >
          <ArrowLeftIcon aria-hidden />
        </Button>
        <Button
          ref={despues}
          type="button"
          variant="ghost"
          size="icon"
          className={BOTON}
          aria-label={`Mover la foto ${foto.orden} después`}
          aria-keyshortcuts="Alt+ArrowRight"
          title={esUltima ? 'Ya es la última' : undefined}
          disabled={ocupado || esUltima}
          onClick={() => {
            acciones.alMover('despues')
          }}
        >
          <ArrowRightIcon aria-hidden />
        </Button>
      </div>
      <div className="flex">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={BOTON}
          aria-label={`Usar la foto ${foto.orden} como portada`}
          title={foto.esPortada ? 'Ya es la portada' : undefined}
          disabled={ocupado || foto.esPortada}
          onClick={acciones.alPonerDePortada}
        >
          <StarIcon aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={BOTON}
          aria-label={`Eliminar la foto ${foto.orden}`}
          disabled={ocupado}
          onClick={acciones.alEliminar}
        >
          <Trash2Icon aria-hidden />
        </Button>
      </div>
    </div>
  )
}
