import 'server-only'
import { BOM_UTF8, lineasDeCsv, type Delimitador } from '@/shared/lib/csv/escribir'
import { leerFiltros, type ParametrosDeUrl, type ValoresDeFiltros } from '@/shared/lib/filtros'
import { leerCursor, type Cursor } from '@/shared/lib/paginacion'
import { alcanceDe, puede, type Permisos } from '@/shared/lib/permisos'
import {
  buscarLeads,
  contarLeadsHasta,
  leerEtiquetas,
  leerLayoutDeLeads,
  leerCatalogosDeLead,
  repositorioDeExportacion,
} from '../../composicion'
import type { CampoDeLead } from '../../entities/campo'
import { condicionesDeLaPersona } from '../listado/condiciones-de-la-persona'
import { esquemaDeFiltrosDeLeads, type CondicionDeLead } from '../../entities/filtros'
import {
  TAMANO_DE_PAGINA_DE_EXPORTACION,
  TOPE_DE_EXPORTACION,
  camposDeExportacion,
  encabezadosDeExportacion,
  filaDeExportacion,
  nombreDeArchivoDeExportacion,
  nombresDeFiltros,
  type ContextoDeExportacion,
} from '../../entities/exportacion'

// Una clave de la consulta que cumple lo que una clave de filtro puede ser. Lo demás (`__proto__`, algo
// con corchetes) no se lee: una clave nunca se usa tal cual como propiedad de un objeto.
const CLAVE_DE_CONSULTA = /^[A-Za-z][A-Za-z0-9_.-]{0,80}$/
const RESERVADAS = new Set(['__proto__', 'constructor', 'prototype'])

// La consulta del listado (`?q=…&origen=…`) como la leen los filtros. Sin prototipo: un objeto plano
// con la clave `__proto__` cambiaría su prototipo en vez de guardar un valor.
export function parametrosDeConsulta(consulta: string): ParametrosDeUrl {
  const buscados = new URLSearchParams(consulta)
  const salida: ParametrosDeUrl = Object.create(null) as ParametrosDeUrl
  for (const clave of new Set(buscados.keys())) {
    if (!CLAVE_DE_CONSULTA.test(clave) || RESERVADAS.has(clave)) {
      continue
    }
    const valores = buscados.getAll(clave)
    salida[clave] = valores.length === 1 ? (valores[0] ?? '') : valores
  }
  return salida
}

type Entrada = {
  // Los efectivos de la sesión (con «ver como», los del rol elegido): sólo dicen si se dibuja el botón.
  // Lo que se exporta lo decide la base: la cartera de quien llama y su permiso real.
  permisos: Permisos
  // La consulta del listado, sin el `?`: los mismos filtros que la persona está viendo.
  consulta: string
  delimitador: Delimitador
  zona: string
  codigoDePais: string | null
  ahora: string
}

export type SalidaDeExportacion =
  | { tipo: 'listo'; nombre: string; cuerpo: string; filas: number }
  | { tipo: 'sin_permiso' }
  | { tipo: 'vacia' }
  | { tipo: 'demasiadas' }
  | { tipo: 'limite'; libreEn: string }
  | { tipo: 'error'; mensaje: string }

const NO_SE_PUDO = 'No pudimos preparar la exportación. Vuelve a intentarlo.'

type EntradaDelArchivo = {
  condiciones: readonly CondicionDeLead[]
  campos: readonly CampoDeLead[]
  delimitador: Delimitador
  contexto: ContextoDeExportacion
}

// El archivo entero: el BOM y los encabezados, y después una página de 500 por vez hasta el final.
// Se arma **dentro del pedido** (las lecturas usan la sesión de la petición, que ya no existe cuando un
// flujo tira de a poco) y con 5.000 filas como tope pesa unos pocos MB. Si una página falla, no hay
// archivo: la respuesta es un error, nunca un CSV cortado.
async function textoDeCsv({ condiciones, campos, delimitador, contexto }: EntradaDelArchivo) {
  const claves = camposDeExportacion(campos).map((campo) => campo.clave)
  const partes = [
    BOM_UTF8 +
      lineasDeCsv([encabezadosDeExportacion(campos, contexto.conNumeroGlobal)], delimitador),
  ]
  let cursor: Cursor | null = null
  let enviadas = 0
  let hayMas = true
  while (hayMas) {
    const pagina = await buscarLeads({
      condiciones,
      cursor,
      tamano: TAMANO_DE_PAGINA_DE_EXPORTACION,
      clavesDeTabla: claves,
      // Un archivo con todo lo que cumple, no con lo que se alcanzó a mirar: sin el tope del recorrido de un campo público.
      sinTope: true,
    })
    if (!pagina.ok) {
      return null
    }
    const filas = pagina.data.filas.slice(0, TOPE_DE_EXPORTACION - enviadas)
    enviadas += filas.length
    cursor = leerCursor(pagina.data.siguiente)
    partes.push(
      lineasDeCsv(
        filas.map((fila) => filaDeExportacion(fila, campos, contexto)),
        delimitador,
      ),
    )
    hayMas = cursor !== null && enviadas < TOPE_DE_EXPORTACION && filas.length > 0
  }
  return partes.join('')
}

// La constancia y el límite, ya con el archivo hecho: una exportación que falló no gasta el cupo, y sin
// constancia no sale ni un byte. Nulo si quedó anotada; si no, lo que hay que contestar en su lugar.
async function dejarConstancia(
  filas: number,
  valores: ValoresDeFiltros,
): Promise<SalidaDeExportacion | null> {
  const registro = await repositorioDeExportacion.registrar({
    filas,
    filtros: nombresDeFiltros(valores),
  })
  if (!registro.ok) {
    return registro.error.codigo === 'sin_permiso'
      ? { tipo: 'sin_permiso' }
      : { tipo: 'error', mensaje: registro.error.mensaje }
  }
  return registro.data.ok ? null : { tipo: 'limite', libreEn: registro.data.libreEn }
}

// El CSV de los leads que muestra el listado con sus filtros, **sólo los de la cartera de quien llama**
// (`en_cartera = true` siempre, aunque tenga `leads.ver` «todos» o lo pida la URL). Primero se cuenta
// hasta el tope (5.001 ids, no un total): con más de 5.000 no se exporta nada y se dice. Después se lee, página a página, y recién con el
// archivo hecho se deja la constancia (con el límite por hora): sin ella no sale nada.
export async function exportarLeadsEnCsv(entrada: Entrada): Promise<SalidaDeExportacion> {
  const { permisos, consulta, delimitador, zona, codigoDePais, ahora } = entrada
  if (!puede(permisos, 'leads.exportar')) {
    return { tipo: 'sin_permiso' }
  }
  const [layout, catalogos, etiquetas] = await Promise.all([
    leerLayoutDeLeads(),
    leerCatalogosDeLead(),
    leerEtiquetas(),
  ])
  if (!layout.ok || !catalogos.ok || !etiquetas.ok) {
    return { tipo: 'error', mensaje: NO_SE_PUDO }
  }
  const campos = layout.data
  const esquema = esquemaDeFiltrosDeLeads({
    campos,
    origenes: catalogos.data.origenes,
    tipos: catalogos.data.tipos,
    verTodos: false,
    etiquetas: etiquetas.data,
  })
  const valores = leerFiltros(esquema, parametrosDeConsulta(consulta))
  const conNumeroGlobal = puede(permisos, 'leads.numero_global.ver')
  // La cartera, siempre: no es un modo que se elija. Se lee como el listado: de la cartera de quien mira si ve sólo lo propio o si la suya es corta.
  const condicionesDe = await condicionesDeLaPersona({
    campos,
    valores,
    permisos,
    zona,
    tipos: catalogos.data.tipos,
    soloMios: true,
    puedeVerTodos: alcanceDe(permisos, 'leads.ver') === 'todos',
  })
  if (!condicionesDe.ok) {
    return { tipo: 'error', mensaje: NO_SE_PUDO }
  }
  const condiciones = condicionesDe.data(valores)

  // Hasta el tope y no más: cuenta pidiendo `tope + 1` ids, nunca el total exacto.
  const contadas = await contarLeadsHasta(condiciones, TOPE_DE_EXPORTACION)
  if (!contadas.ok) {
    return { tipo: 'error', mensaje: NO_SE_PUDO }
  }
  const total = contadas.data.n
  if (total === 0) {
    return { tipo: 'vacia' }
  }
  if (contadas.data.hayMas) {
    return { tipo: 'demasiadas' }
  }
  const cuerpo = await textoDeCsv({
    condiciones,
    campos,
    delimitador,
    contexto: {
      origenes: new Map(catalogos.data.origenes.map((origen) => [origen.id, origen.nombre])),
      tipos: new Map(catalogos.data.tipos.map((tipo) => [tipo.id, tipo.nombre])),
      codigoDePais,
      zona,
      conNumeroGlobal,
    },
  })
  if (cuerpo === null) {
    return { tipo: 'error', mensaje: NO_SE_PUDO }
  }
  const sinConstancia = await dejarConstancia(total, valores)
  if (sinConstancia !== null) {
    return sinConstancia
  }
  return {
    tipo: 'listo',
    nombre: nombreDeArchivoDeExportacion(ahora, zona),
    cuerpo,
    filas: total,
  }
}
