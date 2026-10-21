import { z } from 'zod'

// Un tipo de seguimiento (WhatsApp, Llamada, Visita… y los que la empresa agregue), configurable en Configuración › Leads › Tipos de
// seguimiento. Estas reglas son espejo de `tipo_seguimiento_*()` y `_tipo_seguimiento_nombre()` (`…20261019004000_configuracion_de_leads.sql`): la
// base las vuelve a decir, con estos mismos textos, si algo llega de otro lado.
//
// Ningún tipo es «de sistema»: el código no razona por la clave ni por el nombre de uno (el que el alta propone es el primero de la lista),
// así que cualquiera se apaga y se renombra. Los que tienen seguimientos no se eliminan: se desactivan, y siguen nombrando a los que ya los
// tienen. Lo único fijo es el tope, que lo pone la base.

export const LARGO_MAXIMO_DE_TIPO_DE_SEGUIMIENTO = 40

export const PANEL_NUEVO_TIPO_DE_SEGUIMIENTO = 'nuevo-tipo-de-seguimiento'
export const PANEL_EDITAR_TIPO_DE_SEGUIMIENTO = 'editar-tipo-de-seguimiento'
// La confirmación de eliminar uno (`?panel=eliminar-tipo-de-seguimiento&tipo-de-seguimiento=<id>`).
export const PANEL_ELIMINAR_TIPO_DE_SEGUIMIENTO = 'eliminar-tipo-de-seguimiento'
// El id del tipo que se edita, en la URL.
export const CLAVE_DE_TIPO_DE_SEGUIMIENTO = 'tipo-de-seguimiento'

export type TipoDeSeguimientoConUso = {
  id: string
  clave: string
  nombre: string
  // Una clave del catálogo de iconos, o nada. Una que no se conoce se dibuja neutra (`iconoADibujar`).
  icono: string | null
  activo: boolean
  orden: number
  // La versión: editar, ordenar y eliminar la mandan.
  actualizadoEn: string
  // Algún seguimiento lo usa (también los eliminados): entonces no se elimina, sólo se desactiva.
  conSeguimientos: boolean
}

// Lo que entrega `tipos_seguimiento_con_uso()` y devuelve cada escritura: los tipos y el tope, que lo pone la base (un solo punto).
export type ListaDeTiposDeSeguimiento = { tope: number; tipos: TipoDeSeguimientoConUso[] }

const fila = z.object({
  id: z.guid(),
  clave: z.string(),
  nombre: z.string(),
  icono: z.string().nullable(),
  activo: z.boolean(),
  orden: z.number(),
  actualizado_en: z.string().min(1),
  con_seguimientos: z.boolean(),
})

const listaCruda = z.object({ tope: z.number().int().positive(), tipos: z.array(fila) })

export function listaDeTiposDeSeguimientoDesde(crudo: unknown): ListaDeTiposDeSeguimiento | null {
  const lista = listaCruda.safeParse(crudo)
  if (!lista.success) {
    return null
  }
  return {
    tope: lista.data.tope,
    tipos: lista.data.tipos.map((f) => ({
      id: f.id,
      clave: f.clave,
      nombre: f.nombre,
      icono: f.icono,
      activo: f.activo,
      orden: f.orden,
      actualizadoEn: f.actualizado_en,
      conSeguimientos: f.con_seguimientos,
    })),
  }
}

// Lo que responden las cuatro escrituras: la lista entera (a lo sumo el tope) con las versiones nuevas.
export type RespuestaDeTiposDeSeguimiento = {
  // El tipo que se creó, guardó o movió (nulo al eliminar).
  id: string | null
  // Repetir un pedido que ya estaba hecho: crear con el mismo id, o guardar lo que ya estaba guardado.
  repetido: boolean
  lista: ListaDeTiposDeSeguimiento
}

const respuestaCruda = z.object({
  id: z.guid().optional(),
  repetido: z.boolean().optional(),
  sin_cambios: z.boolean().optional(),
  lista: z.unknown(),
})

export function respuestaDeTiposDeSeguimientoDesde(
  crudo: unknown,
): RespuestaDeTiposDeSeguimiento | null {
  const respuesta = respuestaCruda.safeParse(crudo)
  if (!respuesta.success) {
    return null
  }
  const lista = listaDeTiposDeSeguimientoDesde(respuesta.data.lista)
  if (!lista) {
    return null
  }
  return {
    id: respuesta.data.id ?? null,
    repetido: respuesta.data.repetido === true || respuesta.data.sin_cambios === true,
    lista,
  }
}

// El nombre como lo guarda la base: sin espacios de más.
export function normalizarNombreDeTipoDeSeguimiento(texto: string): string {
  return texto.replace(/\s+/gu, ' ').trim()
}

export const CLAVE_DEL_NOMBRE = 'nombre'
export const CLAVE_DEL_ICONO = 'icono'

type Nombre = { ok: true; nombre: string } | { ok: false; motivo: string }

// `propio` es el tipo que se está editando: su nombre no cuenta como repetido consigo mismo.
export function validarNombreDeTipoDeSeguimiento(
  texto: string,
  tipos: readonly TipoDeSeguimientoConUso[],
  propio: string | null,
): Nombre {
  const nombre = normalizarNombreDeTipoDeSeguimiento(texto)
  if (nombre === '') {
    return { ok: false, motivo: 'Escribe el nombre del tipo de seguimiento.' }
  }
  if ([...nombre].length > LARGO_MAXIMO_DE_TIPO_DE_SEGUIMIENTO) {
    return {
      ok: false,
      motivo: `El nombre del tipo de seguimiento admite hasta ${String(LARGO_MAXIMO_DE_TIPO_DE_SEGUIMIENTO)} caracteres.`,
    }
  }
  const buscado = nombre.toLowerCase()
  if (tipos.some((tipo) => tipo.id !== propio && tipo.nombre.toLowerCase() === buscado)) {
    return { ok: false, motivo: `Ya hay un tipo de seguimiento «${nombre}».` }
  }
  return { ok: true, nombre }
}

// Lo que dice el modal antes de mandar: sólo el nombre se puede rechazar (el icono sale de un catálogo cerrado).
export function validarTipoDeSeguimiento(
  texto: string,
  tipos: readonly TipoDeSeguimientoConUso[],
  original: TipoDeSeguimientoConUso | null,
): { ok: true; nombre: string } | { ok: false; motivos: Record<string, string> } {
  const nombre = validarNombreDeTipoDeSeguimiento(texto, tipos, original?.id ?? null)
  return nombre.ok
    ? { ok: true, nombre: nombre.nombre }
    : { ok: false, motivos: { [CLAVE_DEL_NOMBRE]: nombre.motivo } }
}

// Lo que cambió respecto del tipo que se edita: sólo eso viaja (el icono sin tocar no se manda, aunque sea una clave que ya no se conoce).
export function cambiosDeTipoDeSeguimiento(
  original: TipoDeSeguimientoConUso,
  nombre: string,
  icono: string | null,
): { nombre?: string; icono?: string | null } {
  return {
    ...(nombre === original.nombre ? {} : { nombre }),
    ...(icono === original.icono ? {} : { icono }),
  }
}

export function alTopeDeTiposDeSeguimiento(
  tipos: readonly TipoDeSeguimientoConUso[],
  tope: number,
): boolean {
  return tipos.length >= tope
}

export const textoDelTopeDeSeguimientos = (tope: number) =>
  `Llegaste al máximo de ${String(tope)} tipos de seguimiento. Elimina uno sin seguimientos o desactiva los que no uses.`

// Sin ninguno activo, anotar un seguimiento no tiene qué ofrecer: el alta lo dice y se guarda sin primer seguimiento.
export function sinTiposActivos(tipos: readonly TipoDeSeguimientoConUso[]): boolean {
  return !tipos.some((tipo) => tipo.activo)
}

export function motivoParaNoEliminar(tipo: TipoDeSeguimientoConUso): string | null {
  return tipo.conSeguimientos
    ? `«${tipo.nombre}» ya tiene seguimientos: no se elimina. Desactívalo para que no se ofrezca a los nuevos.`
    : null
}

// Por qué `?panel=eliminar-tipo-de-seguimiento&…=<id>` no abre: el id no está o ya tiene seguimientos. Se revisa una vez, al llegar.
export function motivoParaNoEliminarPorUrl(
  tipos: readonly TipoDeSeguimientoConUso[],
  id: string | null,
): string | null {
  const tipo = tipos.find((t) => t.id === id)
  return tipo ? motivoParaNoEliminar(tipo) : MOTIVO_DE_TIPO_NO_DISPONIBLE
}

export const MOTIVO_DE_TIPO_NO_DISPONIBLE = 'Ese tipo de seguimiento ya no existe.'

export type Direccion = 'subir' | 'bajar'

// A dónde va un tipo al subirlo o bajarlo un lugar, dicho como la base lo recibe: «después de X» (nulo = primero). Nulo si ya está en
// el extremo. La lista va en el orden en que se ve.
export function destinoDeTipoDeSeguimiento(
  tipos: readonly TipoDeSeguimientoConUso[],
  id: string,
  direccion: Direccion,
): { despuesDe: string | null } | null {
  const lugar = tipos.findIndex((tipo) => tipo.id === id)
  if (lugar < 0) {
    return null
  }
  if (direccion === 'subir') {
    return lugar === 0 ? null : { despuesDe: tipos[lugar - 2]?.id ?? null }
  }
  const siguiente = tipos[lugar + 1]
  return siguiente ? { despuesDe: siguiente.id } : null
}

// «Visita» quedó en el lugar 2 de 12: lo que anuncia el lector de pantalla al mover.
export function textoDelLugarDeTipoDeSeguimiento(
  tipos: readonly TipoDeSeguimientoConUso[],
  id: string,
): string {
  const lugar = tipos.findIndex((tipo) => tipo.id === id)
  const tipo = tipos[lugar]
  return tipo
    ? `«${tipo.nombre}» quedó en el lugar ${String(lugar + 1)} de ${String(tipos.length)}.`
    : ''
}

// Por qué `?panel=editar-tipo-de-seguimiento&…=<id>` no abre: el id no está (lo eliminó otra persona, o se escribió a mano).
export function motivoDeUrlDeTipoDeSeguimiento(
  tipos: readonly TipoDeSeguimientoConUso[],
  id: string | null,
): string | null {
  return id !== null && tipos.some((tipo) => tipo.id === id) ? null : MOTIVO_DE_TIPO_NO_DISPONIBLE
}

export function tipoDeSeguimientoPorId(
  tipos: readonly TipoDeSeguimientoConUso[],
  id: string | null,
): TipoDeSeguimientoConUso | null {
  return tipos.find((tipo) => tipo.id === id) ?? null
}

// Una firma de lo que trae la página: si cambia, la lista local se vuelve a sembrar.
export function firmaDeTiposDeSeguimiento(lista: ListaDeTiposDeSeguimiento): string {
  return `${String(lista.tope)}#${lista.tipos
    .map(
      (t) =>
        `${t.id}:${t.actualizadoEn}:${String(t.orden)}:${t.activo ? 1 : 0}:${t.conSeguimientos ? 1 : 0}:${t.icono ?? ''}`,
    )
    .join('|')}`
}

// Por qué el modal de la URL no abre (nulo = abre): «Nuevo tipo» en el tope, o un tipo que no está. Se mira una vez, al llegar.
export function motivoParaNoAbrirTipoDeSeguimiento(
  lista: ListaDeTiposDeSeguimiento,
  modo: 'nuevo' | 'editar' | null,
  id: string | null,
): string | null {
  if (modo === 'nuevo') {
    return alTopeDeTiposDeSeguimiento(lista.tipos, lista.tope)
      ? textoDelTopeDeSeguimientos(lista.tope)
      : null
  }
  return modo === 'editar' ? motivoDeUrlDeTipoDeSeguimiento(lista.tipos, id) : null
}
