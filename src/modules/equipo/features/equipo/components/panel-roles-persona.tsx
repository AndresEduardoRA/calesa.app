'use client'

import type { Permisos } from '@/shared/lib/permisos'
import { Drawer } from '@/shared/ui/drawer'
import { Switch } from '@/shared/ui/switch'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { MOTIVO_ROL_NO_DOMINADO, rolDominado } from '../../../entities/dominancia'
import {
  motivoSobrePersona,
  nombreDePersona,
  type PersonaDelEquipo,
} from '../../../entities/persona'
import type { RolConConcesiones } from '../../../entities/rol'
import { RoleBadge } from '../../roles/components/role-badge'

type Props = {
  // La persona cuyos roles se están cambiando; null = el panel está cerrado.
  persona: PersonaDelEquipo | null
  // Quien mira: sobre su propia cuenta la dominancia no se mira.
  yoId: string
  roles: readonly RolConConcesiones[]
  misPermisos: Permisos
  enCurso: boolean
  alCambiar: (persona: PersonaDelEquipo, rolId: string, asignado: boolean) => void
  alCerrar: () => void
}

// Los roles de una persona. Sus permisos son la unión de los roles que tenga: cada interruptor
// se guarda solo. Un rol con permisos que quien mira no tiene no se puede dar ni quitar, y a una
// persona que no domina (o si no se pudo saber) no se le cambia ninguno: el motivo va arriba (9-1).
export function PanelRolesPersona({
  persona: abierta,
  yoId,
  roles,
  misPermisos,
  enCurso,
  alCambiar,
  alCerrar,
}: Props) {
  // La última persona que mostró, para que el panel no se vacíe mientras se cierra.
  const persona = useUltimo(abierta)
  const nombre = persona ? nombreDePersona(persona) : ''
  const motivoPersona = persona ? motivoSobrePersona(persona, yoId) : null
  return (
    <Drawer
      abierto={abierta !== null}
      alCerrar={alCerrar}
      titulo={persona ? `Roles de ${nombre}` : 'Roles'}
      descripcion="Sus permisos son la suma de los roles que tenga. Cada cambio se guarda solo."
    >
      {motivoPersona ? (
        <p className="pb-2 text-(length:--text-sm) text-(--color-ink-soft)">{motivoPersona}</p>
      ) : null}
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
                      aria-label={[
                        `${rol.nombre} para ${nombre}`,
                        motivoPersona,
                        dominado ? null : MOTIVO_ROL_NO_DOMINADO,
                      ]
                        .filter(Boolean)
                        .join('. ')}
                      checked={persona.roles.some((suyo) => suyo.id === rol.id)}
                      disabled={enCurso || !dominado || motivoPersona !== null}
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
