// Las personas que esperan un rol: lo que Inicio le muestra a quien gestiona el equipo. Reglas puras (cero I/O).
import { z } from 'zod'
import { RUTAS } from '@/shared/lib/rutas'
import { idDePersona } from './persona'
import type { Resultado } from '@/shared/lib/errores'

export type PersonaSinRol = {
  id: string
  // El nombre, o el correo si todavía no tiene.
  nombre: string
}

// Las primeras personas sin rol y si había más (se pide `tope + 1`).
export type PersonasSinRol = { personas: PersonaSinRol[]; hayMas: boolean }

// Activas, no bloqueadas y sin ningún rol, por nombre. El permiso (`equipo.usuarios.gestionar`) lo comprueba quien monta el bloque.
export type LectorDePersonasSinRol = (pedido: {
  tope: number
}) => Promise<Resultado<PersonasSinRol>>

const FilaSinRol = z.object({
  id: z.guid(),
  nombre: z.string().nullable(),
  email: z.string(),
})

// De las filas de `perfiles` a lo que se dibuja: lo mal formado se descarta y el nombre vacío cae al correo.
export function personasSinRolDesde(data: unknown): PersonaSinRol[] {
  if (!Array.isArray(data)) {
    return []
  }
  return data.flatMap((fila) => {
    const leida = FilaSinRol.safeParse(fila)
    if (!leida.success) {
      return []
    }
    const nombre = leida.data.nombre?.trim() ?? ''
    return [{ id: leida.data.id, nombre: nombre === '' ? leida.data.email : nombre }]
  })
}

// Configuración › Equipo con esa persona abierta.
export function rutaDeLaPersona(id: string): string {
  const valido = idDePersona(id)
  return valido ? `${RUTAS.equipo}?persona=${valido}` : RUTAS.equipo
}
