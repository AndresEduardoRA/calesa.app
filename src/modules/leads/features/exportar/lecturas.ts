import 'server-only'
import { BOM_UTF8, lineasDeCsv, type Delimitador } from '@/shared/lib/csv/escribir'
import { leerFiltros, type ParametrosDeUrl } from '@/shared/lib/filtros'
import { leerCursor, type Cursor } from '@/shared/lib/paginacion'
import { puede, type Permisos } from '@/shared/lib/permisos'
import {
  buscarLeads,
  leerEtiquetas,
  leerLayoutDeLeads,
  leerOrigenesDeLead,
  repositorioDeExportacion,
} from '../../composicion'
import type { CampoDeLead } from '../../entities/campo'
import {
  condicionesDeLeads,
  esquemaDeFiltrosDeLeads,
  type CondicionDeLead,
} from '../../entities/filtros'
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

type Archivo =
  { tipo: 'archivo'; cuerpo: string; filas: number } | { tipo: 'vacia' } | { tipo: 'demasiadas' }

// El archivo entero: el BOM y los encabezados, y después una página de 500 por vez hasta el final. Se
// arma **dentro del pedido** (las lecturas usan la sesión de la petición, que ya no existe cuando un
// flujo tira de a poco) y con 5.000 filas como tope pesa unos pocos MB. No se cuenta antes (un conteo
// exacto crece con el total, y uno acotado a 5.001 no cabe en un pedido: PostgREST corta en 1.000): si
// después de 5.000 filas todavía hay otra página, no se exporta nada y se dice. Si una página falla, no
// hay archivo: la respuesta es un error, nunca un CSV cortado.
async function textoDeCsv({
  condiciones,
  campos,
  delimitador,
  contexto,
}: EntradaDelArchivo): Promise<Archivo | null> {
  const claves = camposDeExportacion(campos).map((campo) => campo.clave)
  const partes = [BOM_UTF8 + lineasDeCsv([encabezadosDeExportacion(campos)], delimitador)]
  let cursor: Cursor | null = null
  let enviadas = 0
  for (;;) {
    const pagina = await buscarLeads({
      condiciones,
      cursor,
      tamano: TAMANO_DE_PAGINA_DE_EXPORTACION,
      clavesDeTabla: claves,
    })
    if (!pagina.ok) {
      return null
    }
    enviadas += pagina.data.filas.length
    cursor = leerCursor(pagina.data.siguiente)
    if (enviadas > TOPE_DE_EXPORTACION || (enviadas === TOPE_DE_EXPORTACION && cursor !== null)) {
      return { tipo: 'demasiadas' }
    }
    partes.push(
      lineasDeCsv(
        pagina.data.filas.map((fila) => filaDeExportacion(fila, campos, contexto)),
        delimitador,
      ),
    )
    if (cursor === null || pagina.data.filas.length === 0) {
      break
    }
  }
  return enviadas === 0
    ? { tipo: 'vacia' }
    : { tipo: 'archivo', cuerpo: partes.join(''), filas: enviadas }
}

// El CSV de los leads que muestra el listado con sus filtros, **sólo los de la cartera de quien llama**
// (`en_cartera = true` siempre, aunque tenga `leads.ver` «todos» o lo pida la URL). Se lee página a página:
// con más de 5.000 no se exporta nada y se dice. Recién con el archivo hecho se deja la constancia (con el
// límite por hora): sin ella no sale nada.
export async function exportarLeadsEnCsv(entrada: Entrada): Promise<SalidaDeExportacion> {
  const { permisos, consulta, delimitador, zona, codigoDePais, ahora } = entrada
  if (!puede(permisos, 'leads.exportar')) {
    return { tipo: 'sin_permiso' }
  }
  const [layout, origenes, etiquetas] = await Promise.all([
    leerLayoutDeLeads(),
    leerOrigenesDeLead(),
    leerEtiquetas(),
  ])
  if (!layout.ok || !origenes.ok || !etiquetas.ok) {
    return { tipo: 'error', mensaje: NO_SE_PUDO }
  }
  const campos = layout.data
  const esquema = esquemaDeFiltrosDeLeads({
    campos,
    origenes: origenes.data,
    verTodos: false,
    etiquetas: etiquetas.data,
  })
  const valores = leerFiltros(esquema, parametrosDeConsulta(consulta))
  // La cartera, siempre: no es un modo que se elija.
  const condiciones = condicionesDeLeads(campos, valores, { zona, soloMios: true })

  const archivo = await textoDeCsv({
    condiciones,
    campos,
    delimitador,
    contexto: {
      origenes: new Map(origenes.data.map((origen) => [origen.id, origen.nombre])),
      codigoDePais,
      zona,
    },
  })
  if (archivo === null) {
    return { tipo: 'error', mensaje: NO_SE_PUDO }
  }
  if (archivo.tipo !== 'archivo') {
    return { tipo: archivo.tipo }
  }
  // La constancia y el límite, ya con el archivo hecho: una exportación que falló no gasta el cupo, y
  // sin constancia no sale ni un byte.
  const registro = await repositorioDeExportacion.registrar({
    filas: archivo.filas,
    filtros: nombresDeFiltros(valores),
  })
  if (!registro.ok) {
    return registro.error.codigo === 'sin_permiso'
      ? { tipo: 'sin_permiso' }
      : { tipo: 'error', mensaje: registro.error.mensaje }
  }
  if (!registro.data.ok) {
    return { tipo: 'limite', libreEn: registro.data.libreEn }
  }
  return {
    tipo: 'listo',
    nombre: nombreDeArchivoDeExportacion(ahora, zona),
    cuerpo: archivo.cuerpo,
    filas: archivo.filas,
  }
}
