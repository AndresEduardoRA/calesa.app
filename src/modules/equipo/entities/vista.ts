// Una vista guardada: una combinación de filtros de un listado, con nombre, de una persona. Lo
// que guarda son parámetros de URL: aplicarla es navegar a esa URL, y quien la lee es el mismo
// lector tolerante del listado (un filtro que ya no existe se descarta solo).
import { z } from 'zod'

// Los listados que guardan vistas, con su ruta. Uno nuevo se suma acá.
export const RUTA_DE_PANTALLA = {
  vehiculos: '/vehiculos',
} as const

export type PantallaConVistas = keyof typeof RUTA_DE_PANTALLA

export const PANTALLAS_CON_VISTAS = Object.keys(RUTA_DE_PANTALLA) as [
  PantallaConVistas,
  ...PantallaConVistas[],
]

export const MAXIMO_DE_VISTAS = 20
export const LARGO_MAXIMO_DE_NOMBRE = 40

export type ParamsDeVista = Record<string, string>

export type VistaGuardada = {
  id: string
  nombre: string
  params: ParamsDeVista
}

// Lo que cabe en una URL razonable: pocas claves, valores cortos.
export const esquemaParamsDeVista = z
  .record(z.string().min(1).max(80), z.string().min(1).max(300))
  .refine((params) => Object.keys(params).length <= 40, {
    error: 'Son demasiados filtros para una vista.',
  })

const esquemaVistas = z.array(
  z.object({
    id: z.guid(),
    nombre: z.string(),
    // Unos parámetros ilegibles no tumban el listado: esa vista queda sin filtros.
    params: esquemaParamsDeVista.catch({}),
    orden: z.number(),
  }),
)

// En el orden que eligió la persona y, a igualdad, por nombre.
export function vistasDesde(filas: unknown): VistaGuardada[] {
  return esquemaVistas
    .parse(filas)
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'))
    .map(({ id, nombre, params }) => ({ id, nombre, params }))
}

// ¿Lo que se ve ahora es esa vista? El orden de los parámetros no cuenta.
export function esLaVistaActual(vista: VistaGuardada, actuales: ParamsDeVista): boolean {
  const claves = Object.keys(vista.params)
  return (
    claves.length === Object.keys(actuales).length &&
    claves.every((clave) => vista.params[clave] === actuales[clave])
  )
}

// A dónde lleva aplicar una vista.
export function urlDeVista(ruta: string, params: ParamsDeVista): string {
  const consulta = new URLSearchParams(
    Object.entries(params).sort(([a], [b]) => a.localeCompare(b)),
  ).toString()
  return consulta === '' ? ruta : `${ruta}?${consulta}`
}

// Por qué no se puede guardar una vista más, o null si se puede. Guardar con un nombre que ya
// existe la reemplaza: no suma.
export function motivoParaNoGuardar(
  existentes: readonly VistaGuardada[],
  nombre: string,
): string | null {
  const reemplaza = existentes.some((vista) => vista.nombre === nombre)
  return !reemplaza && existentes.length >= MAXIMO_DE_VISTAS
    ? `Ya tienes ${String(MAXIMO_DE_VISTAS)} vistas guardadas en esta pantalla. Elimina una para guardar otra.`
    : null
}
