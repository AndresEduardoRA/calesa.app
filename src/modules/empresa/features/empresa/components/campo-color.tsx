'use client'

import { useState } from 'react'
import { COLOR_TEMA } from '@/shared/config/app'
import { tokensDeMarca } from '@/shared/lib/color'
import { Campo } from '@/shared/ui/campo'
import { validarColorDeMarca } from '../../../entities/marca'

type Props = {
  // El color guardado, o null si la empresa usa el neutro.
  guardado: string | null
  // El error que devolvió el servidor para este campo, si hubo.
  error?: string
}

// El color de la marca: se tipea o se elige, y mientras tanto se ve cómo queda un botón con él.
// Si no da contraste, el motivo aparece al momento, antes de guardar.
export function CampoColor({ guardado, error }: Props) {
  const [valor, setValor] = useState(guardado ?? '')
  const revisado = valor.trim() === '' ? null : validarColorDeMarca(valor)
  const marca = tokensDeMarca(revisado?.ok ? revisado.color : COLOR_TEMA)

  return (
    <div className="grid gap-2">
      <div className="flex items-end gap-2">
        <input
          type="color"
          aria-label="Elegir el color de la marca"
          value={revisado?.ok ? revisado.color : COLOR_TEMA}
          className="h-11 w-12 shrink-0 cursor-pointer rounded-(--radius-md) border border-(--color-line-strong) bg-(--color-surface) p-1 disabled:cursor-not-allowed disabled:opacity-50 md:h-9"
          onChange={(evento) => {
            setValor(evento.target.value)
          }}
        />
        <div className="min-w-0 flex-1">
          <Campo
            nombre="colorAcento"
            etiqueta="Color de la marca"
            placeholder={COLOR_TEMA}
            autoComplete="off"
            spellCheck={false}
            maxLength={7}
            value={valor}
            error={revisado && !revisado.ok ? revisado.motivo : error}
            onChange={(evento) => {
              setValor(evento.target.value)
            }}
          />
        </div>
      </div>
      {marca.ok ? (
        <p className="flex flex-wrap items-center gap-2 text-(length:--text-sm) text-(--color-ink-faint)">
          <span
            aria-hidden
            className="inline-flex h-8 items-center rounded-(--radius-md) px-3 font-medium"
            // El color sale de lo que se está tipeando: no es un token.
            style={{ background: marca.tokens.primario, color: marca.tokens.sobrePrimario }}
          >
            Guardar
          </span>
          Así se ven los botones. Vacío, queda el color neutro.
        </p>
      ) : null}
    </div>
  )
}
