'use client'

import { Loader2Icon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { cn } from 'cn'
import { RUTAS } from '@/shared/lib/rutas'
import { Campo } from '@/shared/ui/campo'
import { Button } from '@/shared/ui/button'
import { OpcionesDePais } from './opciones-de-pais'
import type { OpcionDePais } from '../../../entities/paises/resolver'
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
  // «+54 91155550000 · Argentina»: cómo va a quedar guardado lo que se escribió y de qué país es,
  // calculado al tipear (sin el servidor).
  comoSeGuarda: string | null
  // «Tomar lead» aceptado (sólo en el alta).
  adoptar: boolean
}

// Lo del país que sólo existe cuando «País» del lead está activo.
export type PaisDelCampo = {
  // Cuando el prefijo es de varios países (+1, +590): a quién se le pregunta.
  opciones: readonly OpcionDePais[]
  // Lo que tiene «País» ahora y cómo se llama ese campo hoy.
  elegido: string
  etiquetaDelCampo: string
  alElegir: (nombre: string) => void
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
  pais?: PaisDelCampo | null
  // Lo que se le dice al lector de pantalla cuando el país del número cambia.
  anuncio?: string | null
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
  const { verificando, aviso, adoptar, verificacion } = telefono
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
      {verificacion?.estado === 'limbo' && alTomar ? (
        <div className="flex flex-wrap items-center gap-2">
          <TomarLead adoptar={adoptar} alTomar={alTomar} />
        </div>
      ) : null}
    </>
  )
}

// La línea con el país se ve apenas el número es un teléfono, también mientras se verifica. Un número
// que ya existe, es de otro o está sin dueño la cede al aviso: nada del otro lead se mezcla.
function sePuedeDecirComoQueda(telefono: EstadoDelTelefono, error: string | undefined): boolean {
  const estado = telefono.verificacion?.estado
  return (
    error === undefined &&
    telefono.comoSeGuarda !== null &&
    (estado === undefined || estado === 'libre')
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
  pais = null,
  anuncio = null,
}: Props) {
  const lineaVisible = sePuedeDecirComoQueda(telefono, error)
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
        ayuda={lineaVisible ? `Se guardará como ${telefono.comoSeGuarda ?? ''}.` : undefined}
        disabled={deshabilitado}
      />
      <p aria-live="polite" className="sr-only">
        {lineaVisible ? anuncio : null}
      </p>
      {lineaVisible && pais && pais.opciones.length > 0 ? (
        <OpcionesDePais
          opciones={pais.opciones}
          elegido={pais.elegido}
          etiquetaDelCampo={pais.etiquetaDelCampo}
          alElegir={pais.alElegir}
        />
      ) : null}
      <div aria-live="polite" className="grid gap-1.5 text-(length:--text-sm)">
        <LoQueSeSabe telefono={telefono} hayError={error !== undefined} alTomar={alTomar} />
      </div>
    </div>
  )
}
