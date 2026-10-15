'use client'

import { Loader2Icon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { cn } from 'cn'
import { RUTAS } from '@/shared/lib/rutas'
import { Campo } from '@/shared/ui/campo'
import { Button } from '@/shared/ui/button'
import {
  leadAbrible,
  type AvisoDeTelefono,
  type Verificacion,
} from '../../../entities/verificacion'

// Lo que se sabe del teléfono que se tipea: lo arma cada pantalla (el alta, el cambio del principal).
export type EstadoDelTelefono = {
  verificando: boolean
  verificacion: Verificacion | null
  aviso: AvisoDeTelefono | null
  // «+591 70011002»: cómo va a quedar guardado lo que se escribió.
  comoSeGuarda: string | null
  // «Tomar lead» aceptado (sólo en el alta).
  adoptar: boolean
}

type Props = {
  id: string
  valor: string
  error: string | undefined
  telefono: EstadoDelTelefono
  deshabilitado: boolean
  alCambiar: (valor: string) => void
  alSalir?: () => void
  // Sin esto no se ofrece «Tomar lead»: sólo el alta puede tomar un lead sin dueño.
  alTomar?: (tomarlo: boolean) => void
  etiqueta?: string
  autoFocus?: boolean
}

const TONO = {
  neutro: 'text-(--color-ink-soft)',
  aviso: 'text-(--color-ink)',
  peligro: 'text-(--color-peligro-ink)',
} as const

type PropsDelEstado = {
  telefono: EstadoDelTelefono
  // Con un error escrito junto al campo, el aviso de la verificación no se repite.
  hayError: boolean
  alTomar: ((tomarlo: boolean) => void) | undefined
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

type PropsDelAviso = {
  aviso: AvisoDeTelefono
  verificacion: Verificacion | null
}

// Lo que se le dice a quien tipea. Si el número ya es de un lead que ve (o es un teléfono extra de
// uno), lleva a su ficha.
function AvisoDelTelefono({ aviso, verificacion }: PropsDelAviso) {
  const abrible = verificacion ? leadAbrible(verificacion) : null
  return (
    <p className={cn(TONO[aviso.tono])}>
      {aviso.texto}
      {abrible ? (
        <>
          {' · '}
          <Link
            href={`${RUTAS.leads}/${abrible}` as Route}
            className="font-medium underline underline-offset-2"
          >
            Abrir
          </Link>
        </>
      ) : null}
    </p>
  )
}

// Lo que se sabe del teléfono: verificándose, nuevo, de quién es, sin dueño.
function LoQueSeSabe({ telefono, hayError, alTomar }: PropsDelEstado) {
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
      {!hayError && conTexto ? (
        <AvisoDelTelefono aviso={aviso} verificacion={verificacion} />
      ) : null}
      {!hayError && verificacion?.estado === 'libre' && comoSeGuarda ? (
        <p className="text-(--color-ink-soft)">Se guardará como {comoSeGuarda}.</p>
      ) : null}
      {verificacion?.estado === 'limbo' && alTomar ? (
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
  etiqueta = 'Teléfono principal',
  autoFocus = true,
}: Props) {
  return (
    <div className="grid gap-1.5">
      <Campo
        nombre={id}
        etiqueta={etiqueta}
        type="tel"
        inputMode="tel"
        autoComplete="off"
        autoFocus={autoFocus}
        value={valor}
        onChange={(evento) => {
          alCambiar(evento.target.value)
        }}
        onBlur={alSalir}
        error={error}
        disabled={deshabilitado}
      />
      <div aria-live="polite" className="grid gap-1.5 text-(length:--text-sm)">
        <LoQueSeSabe telefono={telefono} hayError={error !== undefined} alTomar={alTomar} />
      </div>
    </div>
  )
}
