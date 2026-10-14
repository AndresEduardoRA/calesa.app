'use client'

import { Loader2Icon } from 'lucide-react'
import { cn } from 'cn'
import { Campo } from '@/shared/ui/campo'
import { Button } from '@/shared/ui/button'
import type { AltaDeLead } from '../hooks/use-alta-de-lead'

type Props = {
  id: string
  valor: string
  error: string | undefined
  telefono: AltaDeLead['telefono']
  deshabilitado: boolean
  alCambiar: (valor: string) => void
  alSalir: () => void
  alTomar: (tomarlo: boolean) => void
}

const TONO = {
  neutro: 'text-(--color-ink-soft)',
  aviso: 'text-(--color-ink)',
  peligro: 'text-(--color-peligro-ink)',
} as const

type PropsDelEstado = {
  telefono: AltaDeLead['telefono']
  // Con un error escrito junto al campo, el aviso de la verificación no se repite.
  hayError: boolean
  alTomar: (tomarlo: boolean) => void
}

// «Tomar lead» para un teléfono sin dueño, y lo que significa tomarlo.
function TomarLead({
  adoptar,
  alTomar,
}: {
  adoptar: boolean
  alTomar: (tomarlo: boolean) => void
}) {
  if (!adoptar) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          alTomar(true)
        }}
      >
        Tomar lead
      </Button>
    )
  }
  return (
    <>
      <p className="text-(--color-ink)">
        Lo vas a tomar. Se conserva lo que ya tiene; lo que escribas sólo completa lo que falte.
      </p>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          alTomar(false)
        }}
      >
        No tomarlo
      </Button>
    </>
  )
}

// Lo que se sabe del teléfono: verificándose, nuevo, de quién es, sin dueño.
function EstadoDelTelefono({ telefono, hayError, alTomar }: PropsDelEstado) {
  const { verificando, aviso, comoSeGuarda, adoptar, verificacion } = telefono
  if (verificando) {
    return (
      <p className="flex items-center gap-1.5 text-(--color-ink-soft)">
        <Loader2Icon aria-hidden className="size-3.5 animate-spin" />
        Verificando el teléfono…
      </p>
    )
  }
  const conTexto = aviso !== null && aviso.texto !== ''
  return (
    <>
      {!hayError && conTexto ? <p className={cn(TONO[aviso.tono])}>{aviso.texto}</p> : null}
      {!hayError && aviso !== null && !conTexto && comoSeGuarda ? (
        <p className="text-(--color-ink-soft)">Se guardará como {comoSeGuarda}.</p>
      ) : null}
      {verificacion?.estado === 'limbo' ? (
        <div className="flex flex-wrap items-center gap-2">
          <TomarLead adoptar={adoptar} alTomar={alTomar} />
        </div>
      ) : null}
    </>
  )
}

// El teléfono es la clave del alta: lo que se sabe de él se dice acá mismo, sin salir del campo. El
// resto del formulario sigue editable mientras se verifica.
export function CampoTelefono({
  id,
  valor,
  error,
  telefono,
  deshabilitado,
  alCambiar,
  alSalir,
  alTomar,
}: Props) {
  return (
    <div className="grid gap-1.5">
      <Campo
        nombre={id}
        etiqueta="Teléfono principal"
        type="tel"
        inputMode="tel"
        autoComplete="off"
        autoFocus
        value={valor}
        onChange={(evento) => {
          alCambiar(evento.target.value)
        }}
        onBlur={alSalir}
        error={error}
        disabled={deshabilitado}
      />
      <div aria-live="polite" className="grid gap-1.5 text-(length:--text-sm)">
        <EstadoDelTelefono telefono={telefono} hayError={error !== undefined} alTomar={alTomar} />
      </div>
    </div>
  )
}
