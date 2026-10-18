'use client'

import type { Permisos } from '@/shared/lib/permisos'
import { Campo } from '@/shared/ui/campo'
import { Label } from '@/shared/ui/label'
import { rolDominado } from '../../../entities/dominancia'
import type { RolConConcesiones } from '../../../entities/rol'
import type { useFormularioDeInvitacion } from '../hooks/use-formulario-de-invitacion'

type Props = {
  formulario: ReturnType<typeof useFormularioDeInvitacion>
  roles: readonly RolConConcesiones[]
  misPermisos: Permisos
}

// A quién se invita y con qué rol entra. Un rol con permisos que quien invita no tiene aparece
// deshabilitado, con el motivo: nadie da lo que no tiene.
export function FormularioInvitar({ formulario, roles, misPermisos }: Props) {
  const errorDeRol = formulario.errores['rolId']
  return (
    <>
      <Campo
        nombre="email"
        etiqueta="Correo"
        type="email"
        inputMode="email"
        autoComplete="off"
        value={formulario.email}
        onChange={(evento) => {
          formulario.escribir('email', evento.target.value)
        }}
        error={formulario.errores['email']}
      />
      <Campo
        nombre="nombre"
        etiqueta="Nombre y apellido"
        autoComplete="off"
        ayuda="Opcional: después lo puede cambiar en su perfil."
        value={formulario.nombre}
        onChange={(evento) => {
          formulario.escribir('nombre', evento.target.value)
        }}
        error={formulario.errores['nombre']}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
        <Label htmlFor="rolId">Rol con el que entra</Label>
        <select
          id="rolId"
          name="rolId"
          value={formulario.rolId}
          aria-invalid={errorDeRol ? true : undefined}
          aria-describedby={errorDeRol ? 'rolId-error' : undefined}
          className="h-11 w-full min-w-0 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-2.5 text-(length:--text-sm) text-(--color-ink) md:h-9"
          onChange={(evento) => {
            formulario.escribir('rolId', evento.target.value)
          }}
        >
          <option value="" disabled>
            Elige un rol
          </option>
          {roles.map((rol) => {
            const dominado = rolDominado(misPermisos, rol.concesiones)
            return (
              <option key={rol.id} value={rol.id} disabled={!dominado}>
                {dominado ? rol.nombre : `${rol.nombre} — tiene permisos que tú no tienes`}
              </option>
            )
          })}
        </select>
        {errorDeRol ? (
          <p id="rolId-error" className="text-(length:--text-sm) text-(--color-peligro-ink)">
            {errorDeRol}
          </p>
        ) : null}
      </div>
    </>
  )
}
