'use client'

import type { RefObject } from 'react'
import { errorDeCampo, valoresDe } from '@/shared/lib/formularios'
import type { Permisos } from '@/shared/lib/permisos'
import { Campo } from '@/shared/ui/campo'
import { Label } from '@/shared/ui/label'
import { rolDominado } from '../../../entities/dominancia'
import type { RolConConcesiones } from '../../../entities/rol'

export type DatosDeInvitacion = { email: string; nombre: string; rolId: string }

type Props = {
  id: string
  formulario: RefObject<HTMLFormElement | null>
  roles: readonly RolConConcesiones[]
  misPermisos: Permisos
  errores: Partial<Record<keyof DatosDeInvitacion, string[]>> | undefined
  alEnviar: (datos: DatosDeInvitacion) => void
}

// A quién se invita y con qué rol entra. Un rol con permisos que quien invita no tiene aparece
// deshabilitado, con el motivo: nadie da lo que no tiene.
export function FormularioInvitar({
  id,
  formulario,
  roles,
  misPermisos,
  errores,
  alEnviar,
}: Props) {
  const errorDeRol = errorDeCampo(errores, 'rolId')
  return (
    <form
      id={id}
      ref={formulario}
      noValidate
      className="grid gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        alEnviar(valoresDe(evento.currentTarget, ['email', 'nombre', 'rolId']))
      }}
    >
      <Campo
        nombre="email"
        etiqueta="Correo"
        type="email"
        inputMode="email"
        autoComplete="off"
        error={errorDeCampo(errores, 'email')}
      />
      <Campo
        nombre="nombre"
        etiqueta="Nombre y apellido"
        autoComplete="off"
        ayuda="Opcional: después lo puede cambiar en su perfil."
        error={errorDeCampo(errores, 'nombre')}
      />
      <div className="grid gap-1.5">
        <Label htmlFor="rolId">Rol con el que entra</Label>
        <select
          id="rolId"
          name="rolId"
          defaultValue=""
          aria-invalid={errorDeRol ? true : undefined}
          aria-describedby={errorDeRol ? 'rolId-error' : undefined}
          className="h-11 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-2.5 text-(length:--text-sm) text-(--color-ink) md:h-9"
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
    </form>
  )
}
