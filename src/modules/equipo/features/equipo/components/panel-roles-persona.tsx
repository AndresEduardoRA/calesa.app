'use client'

import type { Permisos } from '@/shared/lib/permisos'
import { Drawer } from '@/shared/ui/drawer'
import { Switch } from '@/shared/ui/switch'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { MOTIVO_ROL_NO_DOMINADO, rolDominado } from '../../../entities/dominancia'
import { nombreDePersona, type PersonaDelEquipo } from '../../../entities/persona'
import type { RolConConcesiones } from '../../../entities/rol'
import { RoleBadge } from '../../roles/components/role-badge'

type Props = {
  // La persona cuyos roles se están cambiando; null = el panel está cerrado.
  persona: PersonaDelEquipo | null
  roles: readonly RolConConcesiones[]
  misPermisos: Permisos
  enCurso: boolean
  alCambiar: (persona: PersonaDelEquipo, rolId: string, asignado: boolean) => void
  alCerrar: () => void
}

// Los roles de una persona. Sus permisos son la unión de los roles que tenga: cada interruptor
// se guarda solo. Un rol con permisos que quien mira no tiene no se puede dar ni quitar.
export function PanelRolesPersona({
  persona: abierta,
  roles,
  misPermisos,
  enCurso,
  alCambiar,
  alCerrar,
}: Props) {
  // La última persona que mostró, para que el panel no se vacíe mientras se cierra.
  const persona = useUltimo(abierta)
  const nombre = persona ? nombreDePersona(persona) : ''
  return (
    <Drawer
      abierto={abierta !== null}
      alCerrar={alCerrar}
      titulo={persona ? `Roles de ${nombre}` : 'Roles'}
      descripcion="Sus permisos son la suma de los roles que tenga. Cada cambio se guarda solo."
    >
      <ul>
        {persona
          ? roles.map((rol) => {
              const dominado = rolDominado(misPermisos, rol.concesiones)
              return (
                <li
                  key={rol.id}
                  className="grid gap-1 border-b border-(--color-line) py-2 last:border-b-0"
                >
                  <div className="flex min-h-11 items-center justify-between gap-3 md:min-h-8">
                    <RoleBadge rol={rol} />
                    <Switch
                      aria-label={
                        dominado
                          ? `${rol.nombre} para ${nombre}`
                          : `${rol.nombre} para ${nombre}. ${MOTIVO_ROL_NO_DOMINADO}`
                      }
                      checked={persona.roles.some((suyo) => suyo.id === rol.id)}
                      disabled={enCurso || !dominado}
                      onCheckedChange={(asignado) => {
                        alCambiar(persona, rol.id, asignado)
                      }}
                    />
                  </div>
                  {dominado ? null : (
                    <p className="text-(length:--text-xs) text-(--color-ink-faint)">
                      {MOTIVO_ROL_NO_DOMINADO}
                    </p>
                  )}
                </li>
              )
            })
          : null}
      </ul>
    </Drawer>
  )
}
