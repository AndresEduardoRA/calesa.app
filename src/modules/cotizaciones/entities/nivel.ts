import { z } from 'zod'
import { compararNombresDeNivel } from '@/shared/lib/permisos'

// Un nivel de acceso de la hoja (D7, paso 4.09): quién ve y quién edita una celda o una sección. Se configura en Configuración › Cotización ›
// Niveles. Estas reglas son espejo de `nivel_*()` y `_nivel_nombre()` (`…20261019006100_niveles_de_acceso.sql`): la base las vuelve a decir, con
// estos mismos textos, si algo llega de otro lado.
//
// **La pantalla no razona por el nombre ni por la clave de un nivel.** Qué admite cada uno lo dice la fila (`seRenombra`, `seRetira`,
// `seElimina`: la misma regla que `_nivel_protegido()` y las RPC) y si algún diseño lo nombra, también (`motivoDeUso`: el texto que dice la
// base al intentar eliminarlo). Un nivel en uso no se elimina, se retira; retirar se deshace con restaurar.

export const LARGO_MAXIMO_DE_NIVEL = 40

export const PANEL_NUEVO_NIVEL = 'nuevo-nivel'
export const PANEL_RENOMBRAR_NIVEL = 'renombrar-nivel'
// La confirmación de eliminar uno (`?panel=eliminar-nivel&nivel=<id>`).
export const PANEL_ELIMINAR_NIVEL = 'eliminar-nivel'
// El id del nivel que se renombra o se elimina, en la URL.
export const CLAVE_DE_NIVEL = 'nivel'
export const CLAVE_DEL_NOMBRE = 'nombre'

export type NivelDeAcceso = {
  id: string
  clave: string
  nombre: string
  // Desde cuándo está retirado (ISO), o nada. Un retirado no se ofrece en un diseño nuevo; lo que ya lo usa se sigue filtrando igual.
  retiradoEn: string | null
  // La versión: renombrar, retirar, restaurar y eliminar la mandan.
  actualizadoEn: string
  seRenombra: boolean
  seRetira: boolean
  seElimina: boolean
  // «Está en 2 celdas de 1 origen…»: por qué no se elimina, si alguna versión de una fórmula lo nombra. Nulo = sin uso.
  motivoDeUso: string | null
}

// Lo que entrega `niveles_con_uso()` y devuelve cada escritura: los niveles (vivos y retirados, a lo sumo el tope) y el tope, que lo pone la base.
export type ListaDeNiveles = { tope: number; niveles: NivelDeAcceso[] }

const fila = z.object({
  id: z.guid(),
  clave: z.string(),
  nombre: z.string(),
  retirado_en: z.string().nullable(),
  actualizado_en: z.string().min(1),
  se_renombra: z.boolean(),
  se_retira: z.boolean(),
  se_elimina: z.boolean(),
  motivo_de_uso: z.string().nullable(),
})

const listaCruda = z.object({ tope: z.number().int().positive(), niveles: z.array(fila) })

export function listaDeNivelesDesde(crudo: unknown): ListaDeNiveles | null {
  const lista = listaCruda.safeParse(crudo)
  if (!lista.success) {
    return null
  }
  return {
    tope: lista.data.tope,
    niveles: lista.data.niveles.map((f) => ({
      id: f.id,
      clave: f.clave,
      nombre: f.nombre,
      retiradoEn: f.retirado_en,
      actualizadoEn: f.actualizado_en,
      seRenombra: f.se_renombra,
      seRetira: f.se_retira,
      seElimina: f.se_elimina,
      motivoDeUso: f.motivo_de_uso,
    })),
  }
}

// Lo que responden las cinco escrituras: la lista entera con las versiones nuevas.
export type RespuestaDeNiveles = {
  // El nivel que se creó, renombró, retiró o restauró (nulo al eliminar).
  id: string | null
  // Repetir un pedido que ya estaba hecho: crear con el mismo id, o restaurar uno que no estaba retirado.
  repetido: boolean
  lista: ListaDeNiveles
}

const respuestaCruda = z.object({
  id: z.guid().optional(),
  repetido: z.boolean().optional(),
  sin_cambios: z.boolean().optional(),
  lista: z.unknown(),
})

export function respuestaDeNivelesDesde(crudo: unknown): RespuestaDeNiveles | null {
  const respuesta = respuestaCruda.safeParse(crudo)
  if (!respuesta.success) {
    return null
  }
  const lista = listaDeNivelesDesde(respuesta.data.lista)
  if (!lista) {
    return null
  }
  return {
    id: respuesta.data.id ?? null,
    repetido: respuesta.data.repetido === true || respuesta.data.sin_cambios === true,
    lista,
  }
}

// El que ninguna acción toca (el de «todos»): se lee y no se cambia.
export function esNivelFijo(nivel: NivelDeAcceso): boolean {
  return !nivel.seRenombra && !nivel.seRetira && !nivel.seElimina
}

export type NivelesSeparados = {
  fijos: NivelDeAcceso[]
  vivos: NivelDeAcceso[]
  retirados: NivelDeAcceso[]
}

// Los fijos primero, después los vivos y aparte los retirados; cada grupo por nombre, con el orden en español de toda la app (la base ordena
// con su colación).
export function separarNiveles(niveles: readonly NivelDeAcceso[]): NivelesSeparados {
  const porNombre = (a: NivelDeAcceso, b: NivelDeAcceso) =>
    compararNombresDeNivel(a.nombre, b.nombre) || a.clave.localeCompare(b.clave)
  const retirados = niveles.filter((nivel) => nivel.retiradoEn !== null).sort(porNombre)
  const vivos = niveles.filter((nivel) => nivel.retiradoEn === null)
  return {
    fijos: vivos.filter(esNivelFijo).sort(porNombre),
    vivos: vivos.filter((nivel) => !esNivelFijo(nivel)).sort(porNombre),
    retirados,
  }
}

// El nombre como lo guarda la base: sin espacios de más.
export function normalizarNombreDeNivel(texto: string): string {
  return texto.replace(/\s+/gu, ' ').trim()
}

type Nombre = { ok: true; nombre: string } | { ok: false; motivo: string }

// `propio` es el nivel que se está renombrando: su nombre no cuenta como repetido consigo mismo.
export function validarNombreDeNivel(
  texto: string,
  niveles: readonly NivelDeAcceso[],
  propio: string | null,
): Nombre {
  const nombre = normalizarNombreDeNivel(texto)
  if (nombre === '') {
    return { ok: false, motivo: 'Escribe el nombre del nivel.' }
  }
  if ([...nombre].length > LARGO_MAXIMO_DE_NIVEL) {
    return {
      ok: false,
      motivo: `El nombre del nivel admite hasta ${String(LARGO_MAXIMO_DE_NIVEL)} caracteres.`,
    }
  }
  const buscado = nombre.toLowerCase()
  if (niveles.some((nivel) => nivel.id !== propio && nivel.nombre.toLowerCase() === buscado)) {
    return { ok: false, motivo: `Ya hay un nivel «${nombre}».` }
  }
  return { ok: true, nombre }
}

// Lo que dice el modal antes de mandar: sólo el nombre se puede rechazar (la clave sale de él y la base dice si ya existe).
export function validarNivel(
  texto: string,
  niveles: readonly NivelDeAcceso[],
  original: NivelDeAcceso | null,
): { ok: true; nombre: string } | { ok: false; motivos: Record<string, string> } {
  const nombre = validarNombreDeNivel(texto, niveles, original?.id ?? null)
  return nombre.ok
    ? { ok: true, nombre: nombre.nombre }
    : { ok: false, motivos: { [CLAVE_DEL_NOMBRE]: nombre.motivo } }
}

export function alTopeDeNiveles(niveles: readonly NivelDeAcceso[], tope: number): boolean {
  return niveles.length >= tope
}

// Un retirado cuenta en el tope y uno en uso no se elimina: el motivo real, no un «no se puede».
export const textoDelTopeDeNiveles = (tope: number) =>
  `Ya hay ${String(tope)} niveles, que es el máximo. Los retirados también cuentan: elimina uno que ninguna hoja use para crear otro.`

// Lo que se puede hacer con un nivel, en el orden del «⋯»: Renombrar · Retirar o Restaurar · ─ · Eliminar. Eliminar siempre figura (apagado y
// con su motivo cuando no se puede); un nivel fijo no ofrece nada.
export type LineaDeNivel = {
  accion: 'renombrar' | 'retirar' | 'restaurar' | 'eliminar'
  // Por qué no se puede (la línea sale apagada y lo dice). Nulo = se puede.
  motivoParaNo: string | null
}

export function motivoParaNoEliminar(nivel: NivelDeAcceso): string | null {
  if (nivel.motivoDeUso !== null) {
    return nivel.motivoDeUso
  }
  if (!nivel.seElimina) {
    return `«${nivel.nombre}» lo traen las hojas de fábrica: no se elimina.${nivel.retiradoEn === null ? ' Puedes retirarlo.' : ''}`
  }
  return null
}

export function accionesDeNivel(nivel: NivelDeAcceso): LineaDeNivel[] {
  if (esNivelFijo(nivel)) {
    return []
  }
  const retirado = nivel.retiradoEn !== null
  return [
    ...(nivel.seRenombra ? [{ accion: 'renombrar' as const, motivoParaNo: null }] : []),
    ...(retirado
      ? [{ accion: 'restaurar' as const, motivoParaNo: null }]
      : nivel.seRetira
        ? [{ accion: 'retirar' as const, motivoParaNo: null }]
        : []),
    { accion: 'eliminar' as const, motivoParaNo: motivoParaNoEliminar(nivel) },
  ]
}

export const MOTIVO_DE_NIVEL_NO_DISPONIBLE = 'Ese nivel ya no existe.'
export const MOTIVO_SIN_PERMISO_DE_NIVELES = 'No tienes permiso para cambiar los niveles de acceso.'

// Por qué `?panel=eliminar-nivel&nivel=<id>` no abre: el id no está, o no se elimina (en uso, o de fábrica). Se revisa una vez, al llegar.
export function motivoParaNoEliminarPorUrl(
  niveles: readonly NivelDeAcceso[],
  id: string | null,
): string | null {
  const nivel = niveles.find((n) => n.id === id)
  return nivel ? motivoParaNoEliminar(nivel) : MOTIVO_DE_NIVEL_NO_DISPONIBLE
}

// Por qué `?panel=renombrar-nivel&nivel=<id>` no abre: el id no está (lo eliminó otra persona, o se escribió a mano), o no se renombra.
export function motivoDeUrlDeNivel(
  niveles: readonly NivelDeAcceso[],
  id: string | null,
): string | null {
  const nivel = niveles.find((n) => n.id === id)
  if (!nivel) {
    return MOTIVO_DE_NIVEL_NO_DISPONIBLE
  }
  return nivel.seRenombra ? null : `El nivel «${nivel.nombre}» no se renombra.`
}

export function nivelPorId(
  niveles: readonly NivelDeAcceso[],
  id: string | null,
): NivelDeAcceso | null {
  return niveles.find((nivel) => nivel.id === id) ?? null
}

// Una firma de lo que trae la página: si cambia, la lista local se vuelve a sembrar.
export function firmaDeNiveles(lista: ListaDeNiveles): string {
  return `${String(lista.tope)}#${lista.niveles
    .map((n) => `${n.id}:${n.actualizadoEn}:${n.retiradoEn ?? ''}:${n.motivoDeUso ?? ''}`)
    .join('|')}`
}

// Por qué el modal de la URL no abre (nulo = abre): quien sólo lee no abre un formulario escribiendo la URL, «Nuevo nivel» no abre en el tope y
// un nivel que no está (o que no se renombra) tampoco. Se mira una vez, al llegar.
export function motivoParaNoAbrirNivel(
  lista: ListaDeNiveles,
  modo: 'nuevo' | 'renombrar' | null,
  id: string | null,
  puedeGestionar: boolean,
): string | null {
  if (modo === null) {
    return null
  }
  if (!puedeGestionar) {
    return MOTIVO_SIN_PERMISO_DE_NIVELES
  }
  if (modo === 'nuevo') {
    return alTopeDeNiveles(lista.niveles, lista.tope) ? textoDelTopeDeNiveles(lista.tope) : null
  }
  return motivoDeUrlDeNivel(lista.niveles, id)
}

// Lo que anuncia el lector de pantalla cuando una fila cambia de grupo.
export function anuncioDeRetiro(nombre: string): string {
  return `«${nombre}» pasó a Retirados.`
}

export function anuncioDeRestauracion(nombre: string): string {
  return `«${nombre}» volvió a los niveles en uso.`
}
