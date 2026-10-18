// Exportar leads a un CSV: qué columnas lleva y cómo se dice cada valor. Sin I/O. La fila ya viene de
// `leads_vista` (los privados sólo le llegan a la cartera) y la consulta fuerza `en_cartera`: acá no se
// decide quién ve qué, sólo cómo se escribe lo que llegó.
//
// - Las columnas son «N.º» (el global, sólo si quien exporta tiene `leads.numero_global.ver`), «N.º propio» (con el global, también «N.º propio de»: su creador), Nombre,
//   Teléfono, Tipo y Origen, y después los campos activos del layout, con su etiqueta y en su orden. Un campo apagado
//   no sale; los privados de la cartera sí. Los números son los que la fila trae (la base ya resolvió cuáles ve la
//   persona); la importación no los lee: los pone el sistema.
// - Una opción sale con su texto (si ya no existe, con la clave guardada); un sí o no, «Sí» o «No»; una
//   fecha, en ISO; una fecha con hora, en la zona de la empresa. Es lo que la importación vuelve a leer.
import { z } from 'zod'
import type { Celda } from '@/shared/lib/csv/escribir'
import { diaEnZona, localDeInstante } from '@/shared/lib/fechas'
import type { ValoresDeFiltros } from '@/shared/lib/filtros'
import type { OpcionDeCampo, TipoDeCampoDeLead } from '@/shared/lib/campos/tipos'
import type { CampoDeLead } from './campo'
import type { FilaDeLead } from './listado'

// Cuántos leads lleva como mucho una exportación: si hay más, se dice y no se corta en silencio.
export const TOPE_DE_EXPORTACION = 5000
// De a cuántos se lee: por debajo del `max_rows` de PostgREST (1.000), que cortaría sin avisar.
export const TAMANO_DE_PAGINA_DE_EXPORTACION = 500
// Cuántas veces por hora y persona (lo aplica `leads_exportacion_registrar`).
export const EXPORTACIONES_POR_HORA = 5
// El separador de las varias opciones de un campo en una sola celda.
export const SEPARADOR_DE_OPCIONES = ' | '

export const ENCABEZADOS_FIJOS = ['Nombre', 'Teléfono', 'Tipo', 'Origen'] as const
export const ENCABEZADO_DEL_NUMERO_GLOBAL = 'N.º'
export const ENCABEZADO_DEL_NUMERO_PROPIO = 'N.º propio'
// Con el global a la vista, «N.º propio» es el de quien creó cada lead (quizá otra persona): esta columna dice de quién.
export const ENCABEZADO_DEL_CREADOR = 'N.º propio de'
// Lo que dice la columna cuando el propio es de quien exporta (el archivo no lleva su nombre).
export const CREADOR_SOY_YO = 'Tú'

export type ContextoDeExportacion = {
  // Nombre de cada origen por id (todos, también los apagados: un lead con uno apagado se nombra).
  origenes: ReadonlyMap<string, string>
  // El nombre de cada tipo de lead por su id, también los apagados: el archivo dice el nombre, no la clave.
  tipos: ReadonlyMap<string, string>
  // El código de país de la empresa, con «+»; nulo si no hay.
  codigoDePais: string | null
  zona: string
  // Quien exporta tiene `leads.numero_global.ver`: el archivo lleva la columna del global.
  conNumeroGlobal: boolean
}

// Los campos que salen: activos, en el orden del layout.
export function camposDeExportacion<Campo extends CampoDeLead>(campos: readonly Campo[]): Campo[] {
  return campos.filter((campo) => campo.activo)
}

export function encabezadosDeExportacion(
  campos: readonly CampoDeLead[],
  conNumeroGlobal = false,
): string[] {
  return [
    ...(conNumeroGlobal ? [ENCABEZADO_DEL_NUMERO_GLOBAL] : []),
    ENCABEZADO_DEL_NUMERO_PROPIO,
    ...(conNumeroGlobal ? [ENCABEZADO_DEL_CREADOR] : []),
    ...ENCABEZADOS_FIJOS,
    ...camposDeExportacion(campos).map((campo) => campo.etiqueta),
  ]
}

// El número completo de la cartera. Si es el de la empresa sale nacional (`70011002`): sin «+» no
// parece una fórmula y la importación lo vuelve a leer igual. Si es de otro país sale con «+».
export function telefonoDeExportacion(numero: string, codigoDePais: string | null): string {
  const digitos = numero.replace(/\D/g, '')
  const codigo = (codigoDePais ?? '').replace(/\D/g, '')
  if (codigo !== '' && digitos.startsWith(codigo)) {
    const nacional = digitos.slice(codigo.length)
    // Un 0 inicial se tomaría por el troncal al volver a importarlo: ese número sale internacional.
    if (nacional !== '' && !nacional.startsWith('0')) {
      return nacional
    }
  }
  return digitos === '' ? '' : `+${digitos}`
}

const etiquetaDeOpcion = (opciones: readonly OpcionDeCampo[], clave: unknown): string => {
  const comoTexto = typeof clave === 'string' || typeof clave === 'number' ? String(clave) : ''
  return opciones.find((opcion) => opcion.clave === comoTexto)?.etiqueta ?? comoTexto
}

type Lector = (campo: CampoDeLead, valor: unknown, zona: string) => Celda

const comoTexto: Lector = (_campo, valor) =>
  typeof valor === 'string' || typeof valor === 'number' ? String(valor) : ''

const comoNumero: Lector = (_campo, valor) => (typeof valor === 'number' ? valor : '')

const comoSiONo: Lector = (_campo, valor) =>
  typeof valor === 'boolean' ? (valor ? 'Sí' : 'No') : ''

const comoFecha: Lector = (_campo, valor) => (typeof valor === 'string' ? valor : '')

const comoFechaConHora: Lector = (_campo, valor, zona) =>
  typeof valor === 'string' ? localDeInstante(valor, { zona }) || valor : ''

const comoOpcion: Lector = (campo, valor) => etiquetaDeOpcion(campo.opciones, valor)

const comoOpciones: Lector = (campo, valor) =>
  Array.isArray(valor)
    ? valor.map((clave) => etiquetaDeOpcion(campo.opciones, clave)).join(SEPARADOR_DE_OPCIONES)
    : ''

// Cómo se dice cada tipo de campo del layout de leads.
const LECTOR_POR_TIPO: Record<TipoDeCampoDeLead, Lector> = {
  texto: comoTexto,
  texto_largo: comoTexto,
  url: comoTexto,
  correo: comoTexto,
  documento: comoTexto,
  numero: comoNumero,
  moneda: comoNumero,
  booleano: comoSiONo,
  fecha: comoFecha,
  fecha_hora: comoFechaConHora,
  opcion: comoOpcion,
  multi_opcion: comoOpciones,
}

// El valor de un campo como lo lee la importación. Lo que no tiene forma de dato sale vacío.
export function valorDeExportacion(campo: CampoDeLead, valor: unknown, zona: string): Celda {
  if (valor === undefined || valor === null || valor === '') {
    return ''
  }
  return LECTOR_POR_TIPO[campo.tipo](campo, valor, zona)
}

// De quién es el número propio de la fila: su creador (nulo si es de quien exporta); vacío si no se ve el propio.
function creadorDelPropio(fila: FilaDeLead): string {
  if (fila.numeros.numeroPropio === null) {
    return ''
  }
  return fila.numeros.creadorDelPropio ?? CREADOR_SOY_YO
}

export function filaDeExportacion(
  fila: FilaDeLead,
  campos: readonly CampoDeLead[],
  contexto: ContextoDeExportacion,
): Celda[] {
  return [
    ...(contexto.conNumeroGlobal ? [fila.numeros.numero ?? ''] : []),
    fila.numeros.numeroPropio ?? '',
    ...(contexto.conNumeroGlobal ? [creadorDelPropio(fila)] : []),
    fila.nombre,
    telefonoDeExportacion(fila.telefono, contexto.codigoDePais),
    contexto.tipos.get(fila.tipoLeadId) ?? '',
    fila.origenId ? (contexto.origenes.get(fila.origenId) ?? '') : '',
    ...camposDeExportacion(campos).map((campo) =>
      valorDeExportacion(campo, fila.atributos[campo.clave], contexto.zona),
    ),
  ]
}

// `leads-AAAA-MM-DD.csv`, con el día en la zona de la empresa.
export function nombreDeArchivoDeExportacion(ahoraIso: string, zona: string): string {
  return `leads-${diaEnZona(ahoraIso, { zona })}.csv`
}

const NOMBRE_VALIDO = /^[a-z][a-z0-9_.]{0,60}$/

// Los NOMBRES de los filtros que se aplicaron (`q`, `origen`, `a.ciudad`…), nunca sus valores: una
// búsqueda puede ser el nombre de una persona y la constancia no guarda datos. Lo que no tiene la forma
// de un nombre de filtro (la base lo rechazaría) no viaja.
export function nombresDeFiltros(valores: ValoresDeFiltros): string[] {
  const nombres = Object.keys(valores.porClave)
  if (valores.busqueda.trim() !== '') {
    nombres.unshift('q')
  }
  return nombres.filter((nombre) => NOMBRE_VALIDO.test(nombre)).slice(0, 40)
}

// Lo que contesta `leads_exportacion_registrar()`: el cupo o, si ya se pasó, desde cuándo vuelve a
// haber. Una forma rota es `null`: no se exporta a ciegas.
export type RegistroDeExportacion = { ok: true; restantes: number } | { ok: false; libreEn: string }

const esquemaRegistro = z.union([
  z.object({ ok: z.literal(true), restantes: z.number().int() }),
  z.object({ ok: z.literal(false), libre_en: z.string() }),
])

export function registroDeExportacionDesde(crudo: unknown): RegistroDeExportacion | null {
  const leido = esquemaRegistro.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const dato = leido.data
  return dato.ok ? { ok: true, restantes: dato.restantes } : { ok: false, libreEn: dato.libre_en }
}

// El panel de la exportación en la URL (`?panel=exportar`) y lo que de la URL no es un filtro.
export const PANEL_EXPORTAR = 'exportar'
const NO_SON_FILTROS = new Set([
  'panel',
  'cursor',
  'por',
  'lead',
  'para',
  'pestana',
  'seguimiento',
  'recordatorio',
  'vista',
  'embudo',
  'etapa',
])

// La consulta del listado que viaja con el pedido: sus filtros (y el modo), sin el panel abierto (ni
// el id que edita), la página ni el lead del drawer (ni su pestaña). Con `+` o `%20`, tal como la
// dejó la URL.
export function consultaDelListado(busqueda: string): string {
  const entrada = new URLSearchParams(busqueda.startsWith('?') ? busqueda.slice(1) : busqueda)
  const salida = new URLSearchParams()
  for (const [clave, valor] of entrada) {
    if (!NO_SON_FILTROS.has(clave)) {
      salida.append(clave, valor)
    }
  }
  return salida.toString()
}

// Lo único que se recuerda de una exportación a otra: el separador (no es un dato de nadie).
export const CLAVE_DE_DELIMITADOR_GUARDADO = 'leads.exportar.delimitador'
