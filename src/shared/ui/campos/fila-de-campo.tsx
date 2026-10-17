'use client'

import { ArrowDownIcon, ArrowUpIcon, PencilIcon } from 'lucide-react'
import {
  MOTIVO_PRIMERO_DE_SU_GRUPO,
  MOTIVO_ULTIMO_DE_SU_GRUPO,
  type CampoBase,
  type Sentido,
} from '@/shared/lib/campos'
import { Button } from '@/shared/ui/button'
import { Switch } from '@/shared/ui/switch'
import { NombreDeCampo } from './nombre-de-campo'
import { banderaDe, type BanderaDeCampo } from './tipos'

type Props = {
  campo: CampoBase
  // Las que se guardan solas desde la fila.
  banderas: readonly BanderaDeCampo[]
  // Lo propio del módulo que dice la fila (un cambio que todavía se está aplicando).
  insignias?: readonly string[]
  puedeGestionar: boolean
  // Mientras algo se guarda no se toca nada: cada edición manda la versión que vio.
  ocupado: boolean
  puedeSubir: boolean
  puedeBajar: boolean
  alAbrir: () => void
  alMover: (sentido: Sentido) => void
  alCambiarBandera: (clave: string, valor: boolean) => void
}

// Un campo del layout: su orden, sus banderas y el panel para el resto.
export function FilaDeCampo(props: Props) {
  const { campo, banderas, insignias = [], puedeGestionar, ocupado, puedeSubir, puedeBajar } = props
  const { alAbrir, alMover, alCambiarBandera } = props
  const sinEditar = !puedeGestionar || ocupado
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
      <div className="order-1 flex shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="size-11 md:size-8"
          aria-label={`Subir ${campo.etiqueta}`}
          title={puedeSubir ? undefined : MOTIVO_PRIMERO_DE_SU_GRUPO}
          disabled={sinEditar || !puedeSubir}
          onClick={() => {
            alMover('subir')
          }}
        >
          <ArrowUpIcon aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 md:size-8"
          aria-label={`Bajar ${campo.etiqueta}`}
          title={puedeBajar ? undefined : MOTIVO_ULTIMO_DE_SU_GRUPO}
          disabled={sinEditar || !puedeBajar}
          onClick={() => {
            alMover('bajar')
          }}
        >
          <ArrowDownIcon aria-hidden />
        </Button>
      </div>
      <NombreDeCampo campo={campo} insignias={insignias} />
      <div className="order-4 flex w-full flex-wrap items-center gap-x-4 gap-y-1 md:order-3 md:w-auto">
        {banderas.map(({ clave, etiqueta }) => (
          <label
            key={clave}
            className="flex min-h-11 items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft) md:min-h-8"
          >
            <Switch
              size="sm"
              aria-label={`${campo.etiqueta}: ${etiqueta.toLowerCase()}`}
              checked={banderaDe(campo, clave)}
              disabled={sinEditar}
              onCheckedChange={(valor) => {
                alCambiarBandera(clave, valor)
              }}
            />
            {etiqueta}
          </label>
        ))}
      </div>
      <Button
        variant="outline"
        className="order-3 h-11 md:order-4 md:h-8"
        aria-label={`${puedeGestionar ? 'Editar' : 'Ver'} ${campo.etiqueta}`}
        onClick={alAbrir}
      >
        <PencilIcon aria-hidden />
        {puedeGestionar ? 'Editar' : 'Ver'}
      </Button>
    </li>
  )
}
