'use client'

import { debounce, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { useState } from 'react'
import type { Permisos } from '@/shared/lib/permisos'
import { EstadoSinResultados } from '@/shared/ui/estados'
import {
  FILTROS_DE_ESTADO,
  filtrarPersonas,
  nombreDePersona,
  type PersonaDelEquipo,
  type VistaPreviaDeBaja,
} from '../../../entities/persona'
import type { RolConConcesiones } from '../../../entities/rol'
import { useAccionesEquipo } from '../hooks/use-acciones-equipo'
import { useInvitaciones } from '../hooks/use-invitaciones'
import { CabeceraEquipo } from './cabecera-equipo'
import { ConfirmarBaja } from './confirmar-baja'
import { EnlaceDePersona, type EnlaceGenerado } from './enlace-de-persona'
import { FiltrosEquipo } from './filtros-equipo'
import { InvitarPersona } from './invitar-persona'
import { PanelRolesPersona } from './panel-roles-persona'
import { TablaEquipo } from './tabla-equipo'

type Props = {
  personas: PersonaDelEquipo[]
  // Con sus concesiones: hacen falta para saber qué roles puede dar quien mira.
  roles: RolConConcesiones[]
  misPermisos: Permisos
  yoId: string
  puedeGestionar: boolean
  // Lo que cuenta la base para la persona de `?baja=`, ya leído en el servidor.
  vistaPreviaDeBaja: (VistaPreviaDeBaja & { personaId: string }) | null
}

const PARAMETROS = {
  q: parseAsString.withDefault(''),
  estado: parseAsStringLiteral(FILTROS_DE_ESTADO).withDefault('vigentes'),
  // Invitar, el panel de roles de una persona y el diálogo de baja tienen su URL.
  panel: parseAsString,
  persona: parseAsString,
  baja: parseAsString,
}

// Las personas del equipo con su estado, y lo que quien lo gestiona puede hacer sobre cada una.
export function ListaEquipo(props: Props) {
  const { personas, roles, misPermisos, yoId, puedeGestionar, vistaPreviaDeBaja } = props
  const [parametros, setParametros] = useQueryStates(PARAMETROS, { shallow: false })
  const { cambiarBloqueo, darBaja, cambiarRol, enCurso } = useAccionesEquipo()
  const { pedirEnlace, generando } = useInvitaciones()
  const [enlace, setEnlace] = useState<EnlaceGenerado | null>(null)
  const visibles = filtrarPersonas(personas, { estado: parametros.estado, texto: parametros.q })
  const buscar = (id: string | null) => personas.find((persona) => persona.id === id) ?? null
  const deLaBaja = buscar(parametros.baja)

  async function generarEnlace(persona: PersonaDelEquipo) {
    const nuevo = await pedirEnlace(persona.id)
    if (nuevo) {
      setEnlace({ nombre: nombreDePersona(persona), enlace: nuevo })
    }
  }

  return (
    <div className="grid gap-4">
      <CabeceraEquipo
        puedeGestionar={puedeGestionar}
        soloYo={personas.length === 1}
        alInvitar={() => void setParametros({ panel: 'invitar' })}
      />
      <FiltrosEquipo
        texto={parametros.q}
        estado={parametros.estado}
        alBuscar={(q) => void setParametros({ q }, { limitUrlUpdates: debounce(300) })}
        alFiltrar={(estado) => void setParametros({ estado })}
      />
      {visibles.length === 0 ? (
        <EstadoSinResultados alLimpiar={() => void setParametros({ q: null, estado: null })} />
      ) : (
        <TablaEquipo
          personas={visibles}
          yoId={yoId}
          puedeGestionar={puedeGestionar}
          deshabilitado={enCurso || generando}
          alVerRoles={(persona) => void setParametros({ persona: persona.id })}
          alCambiarBloqueo={(persona, valor) => void cambiarBloqueo(persona, valor)}
          alDarDeBaja={(persona) => void setParametros({ baja: persona.id })}
          alGenerarEnlace={(persona) => void generarEnlace(persona)}
        />
      )}
      <InvitarPersona
        abierto={puedeGestionar && parametros.panel === 'invitar'}
        alCerrar={() => void setParametros({ panel: null })}
        roles={roles}
        misPermisos={misPermisos}
      />
      <EnlaceDePersona
        generado={enlace}
        alCerrar={() => {
          setEnlace(null)
        }}
      />
      <PanelRolesPersona
        persona={puedeGestionar ? buscar(parametros.persona) : null}
        roles={roles}
        misPermisos={misPermisos}
        enCurso={enCurso}
        alCambiar={(persona, rolId, asignado) => void cambiarRol(persona, rolId, asignado)}
        alCerrar={() => void setParametros({ persona: null })}
      />
      <ConfirmarBaja
        persona={deLaBaja?.estado === 'baja' ? null : deLaBaja}
        vistaPrevia={vistaPreviaDeBaja?.personaId === deLaBaja?.id ? vistaPreviaDeBaja : null}
        enCurso={enCurso}
        alConfirmar={(persona) => {
          void darBaja(persona).then(() => setParametros({ baja: null }))
        }}
        alCerrar={() => void setParametros({ baja: null })}
      />
    </div>
  )
}
