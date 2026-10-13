'use client'

import { ArrowDownIcon, ArrowUpIcon, PencilIcon } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import type { Categoria } from '../../../entities/categoria'
import { contados } from '../../../entities/nombre'
import { MOTIVO_PRIMERA_DE_SU_LUGAR, MOTIVO_ULTIMA_DE_SU_LUGAR } from '../../../entities/motivos'

type Props = {
  categoria: Categoria
  // El sustantivo del origen para contar: «3 lotes».
  sustantivo: string
  puedeGestionar: boolean
  ocupado: boolean
  puedeSubir: boolean
  puedeBajar: boolean
  // Una subcategoría va sangrada bajo su padre.
  esHija: boolean
  alAbrir: () => void
  alSubir: () => void
  alBajar: () => void
}

// Una categoría con sus botones de orden y el panel para editarla.
export function FilaDeCategoria(props: Props) {
  const { categoria, sustantivo, puedeGestionar, ocupado, puedeSubir, puedeBajar, esHija } = props
  const sinEditar = !puedeGestionar || ocupado
  return (
    <li
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 ${esHija ? 'pl-8 sm:pl-12' : ''}`}
    >
      <div className="flex shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="size-11 md:size-8"
          aria-label={`Subir ${categoria.nombre}`}
          title={puedeSubir ? undefined : MOTIVO_PRIMERA_DE_SU_LUGAR}
          disabled={sinEditar || !puedeSubir}
          onClick={props.alSubir}
        >
          <ArrowUpIcon aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 md:size-8"
          aria-label={`Bajar ${categoria.nombre}`}
          title={puedeBajar ? undefined : MOTIVO_ULTIMA_DE_SU_LUGAR}
          disabled={sinEditar || !puedeBajar}
          onClick={props.alBajar}
        >
          <ArrowDownIcon aria-hidden />
        </Button>
      </div>
      <span className="flex min-w-40 flex-1 flex-wrap items-center gap-2">
        <span className="text-(length:--text-base) font-medium text-(--color-ink)">
          {categoria.nombre}
        </span>
        {categoria.activa ? null : <Badge variant="outline">Inactiva</Badge>}
        {categoria.vehiculos === null ? null : (
          <span className="text-(length:--text-sm) text-(--color-ink-faint)">
            {contados(categoria.vehiculos, sustantivo)}
          </span>
        )}
      </span>
      <Button
        variant="outline"
        className="h-11 md:h-8"
        aria-label={`${puedeGestionar ? 'Editar' : 'Ver'} ${categoria.nombre}`}
        onClick={props.alAbrir}
      >
        <PencilIcon aria-hidden />
        {puedeGestionar ? 'Editar' : 'Ver'}
      </Button>
    </li>
  )
}
