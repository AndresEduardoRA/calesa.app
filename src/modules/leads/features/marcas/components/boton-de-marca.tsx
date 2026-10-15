'use client'

import { StarIcon, StrikethroughIcon } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/shared/ui/button'
import { ETIQUETA_DE_FAVORITO, ETIQUETA_DE_TACHADO } from '../../../entities/marcas'

type Props = {
  marca: 'favorito' | 'tachado'
  activo: boolean
  enCurso: boolean
  // Poner, no alternar: recibe el valor que se pide.
  alCambiar: (valor: boolean) => void
}

const ICONO = { favorito: StarIcon, tachado: StrikethroughIcon }
const TEXTO = { favorito: ETIQUETA_DE_FAVORITO, tachado: ETIQUETA_DE_TACHADO }

// Un interruptor de la cabecera de la ficha: el nombre del estado y `aria-pressed` dicen si está
// puesto (el lector de pantalla oye «Favorito, presionado»). Mientras viaja el pedido no acepta otro.
export function BotonDeMarca({ marca, activo, enCurso, alCambiar }: Props) {
  const Icono = ICONO[marca]
  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={activo}
      disabled={enCurso}
      className={cn(
        'h-11 md:h-9',
        activo && marca === 'favorito' && 'border-(--color-aviso) text-(--color-aviso-ink)',
        activo && marca === 'tachado' && 'border-(--color-line-strong) bg-(--color-surface-3)',
      )}
      onClick={() => {
        alCambiar(!activo)
      }}
    >
      <Icono
        aria-hidden
        className={cn('size-4', activo && marca === 'favorito' && 'fill-current')}
      />
      {TEXTO[marca]}
    </Button>
  )
}
