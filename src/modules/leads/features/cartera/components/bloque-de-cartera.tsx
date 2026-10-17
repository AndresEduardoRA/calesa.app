'use client'

import { LogOutIcon, SendIcon, UserMinusIcon, UserPlusIcon } from 'lucide-react'
import { useState } from 'react'
import { formatearFecha } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { Bloque } from '@/shared/ui/bloque'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  ETIQUETA_DE_ACCESO,
  ETIQUETA_DE_SALIR,
  TITULO_DE_CARTERA,
  sePuedeQuitarA,
  type AccionesDeCartera,
  type PersonaDeCartera,
} from '../../../entities/cartera'
import type { NumerosDeLead } from '@/shared/lib/numeros-de-lead'
import { usePanelDeLead } from '../../ficha/hooks/use-panel-de-lead'
import { useCartera } from '../hooks/use-cartera'
import { DialogoDeSalirDiferido, PanelDeCarteraDiferido } from './diferidos'

type Props = {
  // `vePortal`: quien mira gestiona el acceso del cliente (transferir avisa si está vigente).
  lead: {
    id: string
    nombre: string
    numeros: NumerosDeLead
    vehiculosVinculados: number
    vePortal: boolean
  }
  // Como la leyó la página: quién lo tiene, con nombres y tipo de acceso (sin correo ni teléfono).
  cartera: readonly PersonaDeCartera[]
  // Lo que quien mira puede hacer: lo decide la página con sus permisos y la cartera.
  acciones: AccionesDeCartera
}

function FilaDePersona({
  persona,
  acciones,
  enCurso,
  alQuitar,
}: {
  persona: PersonaDeCartera
  acciones: AccionesDeCartera
  enCurso: boolean
  alQuitar: (persona: PersonaDeCartera) => void
}) {
  const { zonaHoraria } = useRegional()
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <span className="min-w-0 text-(length:--text-sm) font-medium break-words">
        {persona.nombre}
        {persona.esYo ? (
          <span className="ml-1.5 font-normal text-(--color-ink-soft)">(tú)</span>
        ) : null}
      </span>
      <Badge variant={persona.tipoAcceso === 'dueno' ? 'default' : 'secondary'}>
        {ETIQUETA_DE_ACCESO[persona.tipoAcceso]}
      </Badge>
      <span className="text-(length:--text-xs) text-(--color-ink-soft)">
        desde {formatearFecha(persona.desde, { zona: zonaHoraria })}
        {persona.compartidoPor ? ` · lo compartió ${persona.compartidoPor}` : ''}
      </span>
      {sePuedeQuitarA(persona, acciones) ? (
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto min-h-11 md:min-h-7"
          disabled={enCurso}
          aria-label={`Quitar acceso a ${persona.nombre}`}
          onClick={() => {
            alQuitar(persona)
          }}
        >
          <UserMinusIcon aria-hidden />
          Quitar acceso
        </Button>
      ) : null}
    </li>
  )
}

function BotonesDeCartera({
  acciones,
  enCurso,
  alSalir,
}: {
  acciones: AccionesDeCartera
  enCurso: boolean
  alSalir: () => void
}) {
  const panel = usePanelDeLead()
  return (
    <div className="flex flex-wrap gap-2">
      {acciones.compartir ? (
        <Button
          variant="outline"
          className="h-11 md:h-9"
          onClick={panel.compartir.abrir}
          disabled={enCurso}
        >
          <UserPlusIcon aria-hidden />
          Compartir
        </Button>
      ) : null}
      {acciones.transferir ? (
        <Button
          variant="outline"
          className="h-11 md:h-9"
          onClick={panel.transferir.abrir}
          disabled={enCurso}
        >
          <SendIcon aria-hidden />
          Transferir
        </Button>
      ) : null}
      {acciones.salir ? (
        <Button variant="ghost" className="h-11 md:h-9" onClick={alSalir} disabled={enCurso}>
          <LogOutIcon aria-hidden />
          {ETIQUETA_DE_SALIR}
        </Button>
      ) : null}
    </div>
  )
}

// «Quién lo tiene», en la sección «Datos» de la ficha: nombres y tipo de acceso de todas las personas
// que lo tienen, para quien ve el lead. Compartir, transferir (con confirmación), quitar acceso y
// «Salir de este lead» se dibujan sólo para quien puede; la base lo vuelve a decidir.
export function BloqueDeCartera({ lead, cartera: inicial, acciones }: Props) {
  const panel = usePanelDeLead()
  const cartera = useCartera(lead.id, inicial)
  const [saliendo, setSaliendo] = useState(false)
  const hayAcciones = acciones.compartir || acciones.transferir || acciones.salir
  const compartiendo = acciones.compartir && panel.compartir.abierto
  const transfiriendo = acciones.transferir && panel.transferir.abierto
  const montarCompartir = useAbiertoAlgunaVez(compartiendo)
  const montarTransferir = useAbiertoAlgunaVez(transfiriendo)
  const montarSalir = useAbiertoAlgunaVez(saliendo)

  return (
    <Bloque titulo={TITULO_DE_CARTERA}>
      <div className="grid gap-3">
        <ul className="divide-y divide-(--color-line)">
          {cartera.cartera.map((persona) => (
            <FilaDePersona
              key={persona.usuarioId}
              persona={persona}
              acciones={acciones}
              enCurso={cartera.enCurso}
              alQuitar={(p) => void cartera.quitar(p)}
            />
          ))}
        </ul>
        {hayAcciones ? (
          <BotonesDeCartera
            acciones={acciones}
            enCurso={cartera.enCurso}
            alSalir={() => {
              setSaliendo(true)
            }}
          />
        ) : null}
      </div>
      {montarCompartir ? (
        <PanelDeCarteraDiferido
          modo="compartir"
          abierto={compartiendo}
          alCerrar={panel.compartir.cerrar}
          lead={lead}
          cartera={cartera}
        />
      ) : null}
      {montarTransferir ? (
        <PanelDeCarteraDiferido
          modo="transferir"
          abierto={transfiriendo}
          alCerrar={panel.transferir.cerrar}
          lead={lead}
          cartera={cartera}
        />
      ) : null}
      {montarSalir ? (
        <DialogoDeSalirDiferido
          abierto={saliendo}
          alCerrar={() => {
            setSaliendo(false)
          }}
          leadNombre={lead.nombre}
          cartera={cartera}
        />
      ) : null}
    </Bloque>
  )
}
