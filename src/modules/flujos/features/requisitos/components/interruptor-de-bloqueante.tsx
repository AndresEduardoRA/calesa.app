'use client'

import { Switch } from '@/shared/ui/switch'

type Props = {
  // `${prefijo}-${id}` del requisito: para devolverle el foco tras confirmar o cancelar.
  marca: string
  descripcion: string
  bloqueante: boolean
  apagado: boolean
  alCambiar: (valor: boolean) => void
}

// El interruptor «Bloqueante» de la fila. Lo dice también el `<Badge>` con texto: el interruptor es lo que se maneja y el texto lo que se lee.
export function InterruptorDeBloqueante({
  marca,
  descripcion,
  bloqueante,
  apagado,
  alCambiar,
}: Props) {
  return (
    <Switch
      size="sm"
      data-bloqueante={marca}
      aria-label={`Bloqueante: ${descripcion}`}
      checked={bloqueante}
      disabled={apagado}
      onCheckedChange={alCambiar}
    />
  )
}
