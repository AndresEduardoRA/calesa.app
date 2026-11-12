'use client'

import { textoDeNoLeidos } from '../../../entities/conversaciones'
import { useNoLeidos } from '../hooks/use-no-leidos'

// El contador de la entrada «Chat» de la barra lateral (y del menú del celular): lee el mismo store que la burbuja. Nada si no hay sin leer.
export function NoLeidosDeLaBarra() {
  const noLeidos = useNoLeidos()
  const texto = textoDeNoLeidos(noLeidos)
  if (!texto) {
    return null
  }
  return (
    <span
      role="img"
      aria-label={noLeidos > 99 ? 'más de 99 sin leer' : `${texto} sin leer`}
      data-no-leidos-de-la-barra=""
      className="ml-auto min-w-5 rounded-full bg-(--color-primario) px-1.5 py-0.5 text-center text-[10px] leading-none font-medium text-(--color-sobre-primario) tabular-nums"
    >
      {texto}
    </span>
  )
}
