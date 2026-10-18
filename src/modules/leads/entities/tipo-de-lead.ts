import { z } from 'zod'

// El tipo de un lead (Prospecto, Cliente y los que la empresa agregue), configurable en Configuración › Leads › Tipos de lead.
// Estas reglas son espejo de `tipo_lead_*()`, `_tipo_lead_nombre()` y los triggers de `tipos_lead`
// (`…20261019002800_tipos_de_lead.sql` y `…002900`): la base las vuelve a decir, con estos mismos textos, si algo llega de otro lado.
//
// Cada tipo es de una CLASE fija, la única parte que no se configura: un lead «prospecto» todavía no compró y uno «cliente» ya
// compró. El sistema razona por la clase y nunca por el nombre ni por la clave de un tipo (la cotización final pasa al lead a
// cliente; las métricas de conversión cuentan por clase: `docs/PLAN.md`, Fases 4 y 9). Los dos nombres de las clases son del
// sistema y no son nombres de tipos: ningún tipo se nombra desde acá.

export const CLASES_DE_TIPO = ['prospecto', 'cliente'] as const
export type ClaseDeTipoDeLead = (typeof CLASES_DE_TIPO)[number]

export const NOMBRE_DE_CLASE: Record<ClaseDeTipoDeLead, string> = {
  prospecto: 'Prospecto',
  cliente: 'Cliente',
}

// Lo que cada clase quiere decir, al elegirla en «Nuevo tipo»: no se cambia después.
export const EXPLICACION_DE_CLASE: Record<ClaseDeTipoDeLead, string> = {
  prospecto: 'Todavía no compró: está en conversación. Los leads nuevos empiezan acá.',
  cliente: 'Ya compró. Una cotización final lo pasa a este grupo.',
}

export const LARGO_MAXIMO_DE_TIPO = 40

export const PANEL_NUEVO_TIPO = 'nuevo-tipo'
export const PANEL_EDITAR_TIPO = 'editar-tipo'
// La confirmación de eliminar uno (`?panel=eliminar-tipo&tipo=<id>`).
export const PANEL_ELIMINAR_TIPO = 'eliminar-tipo'
// El id del tipo que se edita, en la URL: `?panel=editar-tipo&tipo=<id>`.
export const CLAVE_DE_TIPO = 'tipo'

export type TipoDeLeadConUso = {
  id: string
  clave: string
  nombre: string
  clase: ClaseDeTipoDeLead
  activo: boolean
  orden: number
  // La versión: editar, ordenar y eliminar la mandan.
  actualizadoEn: string
  // Algún lead lo usa (también en la papelera): entonces no se elimina, sólo se desactiva.
  conLeads: boolean
}

// Lo que entrega `tipos_lead_con_uso()` y devuelve cada escritura: los tipos y el tope, que lo pone la base (un solo punto).
export type ListaDeTipos = { tope: number; tipos: TipoDeLeadConUso[] }

const filaDeTipo = z.object({
  id: z.guid(),
  clave: z.string(),
  nombre: z.string(),
  clase: z.enum(CLASES_DE_TIPO),
  activo: z.boolean(),
  orden: z.number(),
  actualizado_en: z.string().min(1),
  con_leads: z.boolean(),
})

const listaCruda = z.object({ tope: z.number().int().positive(), tipos: z.array(filaDeTipo) })

export function listaDeTiposDesde(crudo: unknown): ListaDeTipos | null {
  const lista = listaCruda.safeParse(crudo)
  if (!lista.success) {
    return null
  }
  return {
    tope: lista.data.tope,
    tipos: lista.data.tipos.map((fila) => ({
      id: fila.id,
      clave: fila.clave,
      nombre: fila.nombre,
      clase: fila.clase,
      activo: fila.activo,
      orden: fila.orden,
      actualizadoEn: fila.actualizado_en,
      conLeads: fila.con_leads,
    })),
  }
}

// Lo que responden las cuatro escrituras: la lista entera (a lo sumo el tope) con las versiones nuevas.
export type RespuestaDeTipos = {
  // El tipo que se creó, guardó o movió (nulo al eliminar).
  id: string | null
  // Repetir un pedido que ya estaba hecho: crear con el mismo id, o guardar lo que ya estaba guardado.
  repetido: boolean
  lista: ListaDeTipos
}

const respuestaCruda = z.object({
  id: z.guid().optional(),
  repetido: z.boolean().optional(),
  sin_cambios: z.boolean().optional(),
  lista: z.unknown(),
})

export function respuestaDeTiposDesde(crudo: unknown): RespuestaDeTipos | null {
  const respuesta = respuestaCruda.safeParse(crudo)
  if (!respuesta.success) {
    return null
  }
  const lista = listaDeTiposDesde(respuesta.data.lista)
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
export function normalizarNombreDeTipo(texto: string): string {
  return texto.replace(/\s+/gu, ' ').trim()
}

export const CLAVE_DEL_NOMBRE = 'nombre'
export const CLAVE_DE_LA_CLASE = 'clase'

type Nombre = { ok: true; nombre: string } | { ok: false; motivo: string }

// `propio` es el tipo que se está editando: su nombre no cuenta como repetido consigo mismo.
export function validarNombreDeTipo(
  texto: string,
  tipos: readonly TipoDeLeadConUso[],
  propio: string | null,
): Nombre {
  const nombre = normalizarNombreDeTipo(texto)
  if (nombre === '') {
    return { ok: false, motivo: 'Escribe el nombre del tipo.' }
  }
  if ([...nombre].length > LARGO_MAXIMO_DE_TIPO) {
    return {
      ok: false,
      motivo: `El nombre del tipo admite hasta ${LARGO_MAXIMO_DE_TIPO} caracteres.`,
    }
  }
  const buscado = nombre.toLowerCase()
  if (tipos.some((tipo) => tipo.id !== propio && tipo.nombre.toLowerCase() === buscado)) {
    return { ok: false, motivo: `Ya hay un tipo «${nombre}».` }
  }
  return { ok: true, nombre }
}

export const MOTIVO_SIN_CLASE = 'Elige la clase del tipo: prospecto o cliente.'

type Validacion =
  | { ok: true; nombre: string; clase: ClaseDeTipoDeLead }
  | { ok: false; motivos: Record<string, string> }

// Lo que dice el formulario del modal antes de mandar: el nombre y, al crear (`original` nulo), la clase. Los motivos van por
// campo (las claves son las del formulario y las del `hint` de la base). Editar conserva la clase del tipo.
export function validarTipo(
  texto: string,
  clase: ClaseDeTipoDeLead | null,
  tipos: readonly TipoDeLeadConUso[],
  original: TipoDeLeadConUso | null,
): Validacion {
  const nombre = validarNombreDeTipo(texto, tipos, original?.id ?? null)
  const claseFinal = original?.clase ?? clase
  const motivos: Record<string, string> = {
    ...(nombre.ok ? {} : { [CLAVE_DEL_NOMBRE]: nombre.motivo }),
    ...(claseFinal === null ? { [CLAVE_DE_LA_CLASE]: MOTIVO_SIN_CLASE } : {}),
  }
  if (!nombre.ok || claseFinal === null) {
    return { ok: false, motivos }
  }
  return { ok: true, nombre: nombre.nombre, clase: claseFinal }
}

export function alTopeDeTipos(tipos: readonly TipoDeLeadConUso[], tope: number): boolean {
  return tipos.length >= tope
}

export const textoDelTope = (tope: number) =>
  `Llegaste al máximo de ${String(tope)} tipos. Elimina uno sin leads o desactiva los que no uses.`

// Siempre queda un tipo activo de cada clase (lo impone la base): el último activo de la suya no se apaga ni se elimina.
export function esElUnicoActivoDeSuClase(
  tipos: readonly TipoDeLeadConUso[],
  tipo: TipoDeLeadConUso,
): boolean {
  return (
    tipo.activo &&
    !tipos.some((otro) => otro.id !== tipo.id && otro.activo && otro.clase === tipo.clase)
  )
}

// Por qué «Activo» no se puede apagar (nulo = se puede). El mismo texto que dice la base.
export function motivoParaNoDesactivar(
  tipos: readonly TipoDeLeadConUso[],
  tipo: TipoDeLeadConUso,
): string | null {
  return esElUnicoActivoDeSuClase(tipos, tipo)
    ? `Es el único tipo activo de la clase «${tipo.clase}»: activa o crea otro antes.`
    : null
}

export function motivoParaNoEliminar(
  tipos: readonly TipoDeLeadConUso[],
  tipo: TipoDeLeadConUso,
): string | null {
  if (tipo.conLeads) {
    return `«${tipo.nombre}» ya tiene leads: no se elimina. Desactívalo para que no se ofrezca a los nuevos.`
  }
  return esElUnicoActivoDeSuClase(tipos, tipo)
    ? `«${tipo.nombre}» es el único tipo activo de la clase «${tipo.clase}»: no se elimina. Activa o crea otro antes.`
    : null
}

// Por qué `?panel=eliminar-tipo&tipo=<id>` no abre: el id no está, o ya tiene leads, o es el último activo de su clase.
// Se revisa una vez, al llegar.
export function motivoParaNoEliminarPorUrl(
  tipos: readonly TipoDeLeadConUso[],
  id: string | null,
): string | null {
  const tipo = tipos.find((t) => t.id === id)
  return tipo ? motivoParaNoEliminar(tipos, tipo) : 'Ese tipo ya no existe.'
}

export type Direccion = 'subir' | 'bajar'

// A dónde va un tipo al subirlo o bajarlo un lugar, dicho como la base lo recibe: «después de X»
// (nulo = primero). Nulo si ya está en el extremo. La lista va en el orden en que se ve.
export function destinoDeTipo(
  tipos: readonly TipoDeLeadConUso[],
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

// «Cliente» quedó en el lugar 2 de 12: lo que anuncia el lector de pantalla al mover.
export function textoDelLugar(tipos: readonly TipoDeLeadConUso[], id: string): string {
  const lugar = tipos.findIndex((tipo) => tipo.id === id)
  const tipo = tipos[lugar]
  return tipo ? `«${tipo.nombre}» quedó en el lugar ${lugar + 1} de ${tipos.length}.` : ''
}

// Por qué `?panel=editar-tipo&tipo=<id>` no abre: el id no está (lo eliminó otra persona, o se
// escribió a mano).
export function motivoDeUrlDeTipo(
  tipos: readonly TipoDeLeadConUso[],
  id: string | null,
): string | null {
  if (id === null) {
    return 'Ese tipo ya no existe.'
  }
  return tipos.some((tipo) => tipo.id === id) ? null : 'Ese tipo ya no existe.'
}

export function tipoPorId(
  tipos: readonly TipoDeLeadConUso[],
  id: string | null,
): TipoDeLeadConUso | null {
  return tipos.find((tipo) => tipo.id === id) ?? null
}

// Una firma de lo que trae la página: si cambia, la lista local se vuelve a sembrar.
export function firmaDeTipos(lista: ListaDeTipos): string {
  return `${String(lista.tope)}#${lista.tipos
    .map((t) => `${t.id}:${t.actualizadoEn}:${t.orden}:${t.activo ? 1 : 0}:${t.conLeads ? 1 : 0}`)
    .join('|')}`
}

// Por qué el modal de la URL no abre (nulo = abre): «Nuevo tipo» en el tope, o un tipo que no está.
// Se mira una vez, al llegar.
export function motivoParaNoAbrir(
  lista: ListaDeTipos,
  modo: 'nuevo' | 'editar' | null,
  id: string | null,
): string | null {
  if (modo === 'nuevo') {
    return alTopeDeTipos(lista.tipos, lista.tope) ? textoDelTope(lista.tope) : null
  }
  return modo === 'editar' ? motivoDeUrlDeTipo(lista.tipos, id) : null
}
