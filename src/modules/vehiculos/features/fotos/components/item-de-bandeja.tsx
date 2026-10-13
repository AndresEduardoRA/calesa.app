import { ImageIcon, LoaderCircleIcon, XIcon } from 'lucide-react'
import Image from 'next/image'
import { cn } from 'cn'
import { Button } from '@/shared/ui/button'
import type { EstadoDeItem, ItemVisto } from '../bandeja'

type Props = { item: ItemVisto; ocupado: boolean; alQuitar: () => void }

const EN_QUE_ESTA: Record<EstadoDeItem, string> = {
  preparando: 'Leyendo…',
  lista: 'Lista para subir',
  subiendo: 'Subiendo…',
  rechazada: 'No se va a subir.',
  fallida: 'No se pudo subir.',
}

// Qué se dice de un ítem: su motivo si no entra o falló; si no, en qué está.
const estadoDicho = (item: ItemVisto) => item.aviso ?? EN_QUE_ESTA[item.estado]

// Un archivo elegido: su vista previa (la miniatura que se va a subir), su nombre y qué va a
// pasar con él. Todavía no es una foto del vehículo.
export function ItemDeBandeja({ item, ocupado, alQuitar }: Props) {
  const conProblema = item.disposicion === 'no_entra' || item.estado === 'fallida'
  const trabajando = item.estado === 'preparando' || item.estado === 'subiendo'
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="relative flex aspect-4/3 w-16 shrink-0 items-center justify-center overflow-hidden rounded-(--radius-sm) bg-(--color-paper-dim) text-(--color-ink-faint)">
        {item.vista ? (
          // Una dirección local (`blob:`): no hay nada que optimizar.
          <Image src={item.vista} alt="" fill unoptimized sizes="64px" className="object-cover" />
        ) : (
          <ImageIcon aria-hidden className="size-5" />
        )}
      </span>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-(length:--text-sm) text-(--color-ink)">{item.nombre}</span>
        <span
          className={cn(
            'flex items-center gap-1.5 text-(length:--text-xs)',
            conProblema ? 'text-(--color-peligro-ink)' : 'text-(--color-ink-soft)',
          )}
        >
          {trabajando ? (
            <LoaderCircleIcon aria-hidden className="size-3.5 animate-spin motion-reduce:hidden" />
          ) : null}
          {estadoDicho(item)}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 md:size-8"
        aria-label={`Quitar ${item.nombre}`}
        disabled={ocupado}
        onClick={alQuitar}
      >
        <XIcon aria-hidden />
      </Button>
    </li>
  )
}
