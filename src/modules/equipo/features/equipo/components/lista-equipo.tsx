'use client'

import { debounce, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import type { Permisos } from '@/shared/lib/permisos'
import { Aviso } from '@/shared/ui/aviso'
import { EstadoSinResultados } from '@/shared/ui/estados'
import {
  FILTROS_DE_ESTADO,
  accionesSobre,
  filtrarPersonas,
  nombreDePersona,
  type PersonaDelEquipo,
  type VistaPreviaDeBaja,
} from '../../../entities/persona'
import type { RolConConcesiones } from '../../../entities/rol'
import { useAccionesEquipo } from '../hooks/use-acciones-equipo'
import { ConfirmarBaja } from './confirmar-baja'
import { FilaPersona } from './fila-persona'
import { FiltrosEquipo } from './filtros-equipo'
import { MenuPersona } from './menu-persona'
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
  // El panel de roles de una persona y el diálogo de baja tienen su URL.
  persona: parseAsString,
  baja: parseAsString,
}

// Las personas del equipo con su estado, y lo que quien lo gestiona puede hacer sobre cada una.
export function ListaEquipo(props: Props) {
  const { personas, roles, misPermisos, yoId, puedeGestionar, vistaPreviaDeBaja } = props
  const [parametros, setParametros] = useQueryStates(PARAMETROS, { shallow: false })
  const { cambiarBloqueo, darBaja, cambiarRol, enCurso } = useAccionesEquipo()
  const visibles = filtrarPersonas(personas, { estado: parametros.estado, texto: parametros.q })
  const deLaBaja = personas.find(
    (persona) => persona.id === parametros.baja && persona.estado !== 'baja',
  )

  return (
    <div className="grid gap-4">
      <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Equipo</h1>
      {personas.length === 1 ? (
        <Aviso>Por ahora el equipo eres tú. Cuando invites a alguien aparece acá.</Aviso>
      ) : null}
      <FiltrosEquipo
        texto={parametros.q}
        estado={parametros.estado}
        alBuscar={(q) => void setParametros({ q }, { limitUrlUpdates: debounce(300) })}
        alFiltrar={(estado) => void setParametros({ estado })}
      />
      {visibles.length === 0 ? (
        <EstadoSinResultados alLimpiar={() => void setParametros({ q: null, estado: null })} />
      ) : (
        <TablaEquipo>
          {visibles.map((persona) => (
            <FilaPersona
              key={persona.id}
              persona={persona}
              esPropia={persona.id === yoId}
              acciones={
                puedeGestionar && persona.estado !== 'baja' ? (
                  <MenuPersona
                    nombre={nombreDePersona(persona)}
                    acciones={accionesSobre(persona, yoId)}
                    deshabilitado={enCurso}
                    alVerRoles={() => void setParametros({ persona: persona.id })}
                    alCambiarBloqueo={(valor) => void cambiarBloqueo(persona, valor)}
                    alDarDeBaja={() => void setParametros({ baja: persona.id })}
                  />
                ) : null
              }
            />
          ))}
        </TablaEquipo>
      )}
      <PanelRolesPersona
        persona={
          puedeGestionar
            ? (personas.find((persona) => persona.id === parametros.persona) ?? null)
            : null
        }
        roles={roles}
        misPermisos={misPermisos}
        enCurso={enCurso}
        alCambiar={(persona, rolId, asignado) => void cambiarRol(persona, rolId, asignado)}
        alCerrar={() => void setParametros({ persona: null })}
      />
      <ConfirmarBaja
        persona={deLaBaja ?? null}
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
