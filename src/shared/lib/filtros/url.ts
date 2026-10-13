// Los filtros de un listado viven en la URL (.claude/rules/ui.md). Acá se leen y se escriben, sin
// nuqs: quien sincroniza la URL es `useFiltros()`. La lectura es tolerante: un valor que no
// corresponde al esquema (una opción que ya no existe, un año imposible, texto donde iba un
// número) se descarta en vez de romper la pantalla.
import type {
  DefFiltro,
  EsquemaDeFiltros,
  ParametrosDeUrl,
  ValorDeFiltro,
  ValoresDeFiltros,
} from './esquema'

export const LARGO_MAXIMO_DE_TEXTO = 100

// Claves de la URL que un listado comparte con su `FilterShell`. La página de la lista (cambiar
// un filtro vuelve a la primera) y el panel abierto (la hoja de filtros del celular, o el que
// abra el listado: «nuevo», un registro).
export const CLAVE_DE_CURSOR = 'cursor'
export const CLAVE_DE_PANEL = 'panel'
export const PANEL_DE_FILTROS = 'filtros'

const FECHA = /^\d{4}-\d{2}-\d{2}$/

// Las claves de la URL que le pertenecen a un filtro.
export function clavesDeFiltro(def: DefFiltro): string[] {
  switch (def.tipo) {
    case 'rango_numero':
      return [`${def.clave}.min`, `${def.clave}.max`]
    case 'rango_fecha':
      return [`${def.clave}.desde`, `${def.clave}.hasta`]
    case 'texto':
    case 'opciones':
    case 'booleano':
      return [def.clave]
  }
}

// Todas las claves de la URL que maneja el esquema: es lo que `useFiltros()` sincroniza.
export function clavesDeUrl(esquema: EsquemaDeFiltros): string[] {
  return [
    ...(esquema.busqueda ? [esquema.busqueda.clave] : []),
    ...esquema.filtros.flatMap(clavesDeFiltro),
  ]
}

function uno(parametros: ParametrosDeUrl, clave: string): string {
  const valor = parametros[clave]
  const texto = Array.isArray(valor) ? valor[0] : valor
  return (texto ?? '').trim()
}

function numeroDe(texto: string, def: Extract<DefFiltro, { tipo: 'rango_numero' }>): number | null {
  if (texto === '') {
    return null
  }
  const numero = Number(texto)
  const valido =
    Number.isFinite(numero) &&
    numero >= def.minimo &&
    numero <= def.maximo &&
    (!def.entero || Number.isInteger(numero))
  return valido ? numero : null
}

function fechaDe(texto: string): string | null {
  // Además del formato, que sea un día que existe (no «2026-02-31»).
  if (!FECHA.test(texto)) {
    return null
  }
  const instante = new Date(`${texto}T00:00:00Z`)
  return !Number.isNaN(instante.getTime()) && instante.toISOString().startsWith(texto)
    ? texto
    : null
}

// Un rango escrito al revés se da vuelta: es lo que la persona quiso decir.
function ordenar<T extends number | string>(a: T | null, b: T | null): [T | null, T | null] {
  return a !== null && b !== null && a > b ? [b, a] : [a, b]
}

type De<Tipo extends DefFiltro['tipo']> = Extract<DefFiltro, { tipo: Tipo }>

function leerTexto(def: De<'texto'>, parametros: ParametrosDeUrl): ValorDeFiltro | null {
  const texto = uno(parametros, def.clave).slice(0, LARGO_MAXIMO_DE_TEXTO)
  return texto === '' ? null : { tipo: 'texto', texto }
}

// Sólo las opciones que el esquema ofrece hoy: una que ya no existe se descarta.
function leerOpciones(def: De<'opciones'>, parametros: ParametrosDeUrl): ValorDeFiltro | null {
  const validas = new Set(def.opciones.map((opcion) => opcion.valor))
  const pedidas = uno(parametros, def.clave).split(',')
  const valores = [...new Set(pedidas.filter((valor) => validas.has(valor)))]
  return valores.length === 0 ? null : { tipo: 'opciones', valores }
}

function leerBooleano(def: De<'booleano'>, parametros: ParametrosDeUrl): ValorDeFiltro | null {
  const texto = uno(parametros, def.clave)
  return texto === 'si' || texto === 'no' ? { tipo: 'booleano', valor: texto === 'si' } : null
}

function leerRangoNumero(
  def: De<'rango_numero'>,
  parametros: ParametrosDeUrl,
): ValorDeFiltro | null {
  const [min, max] = ordenar(
    numeroDe(uno(parametros, `${def.clave}.min`), def),
    numeroDe(uno(parametros, `${def.clave}.max`), def),
  )
  return min === null && max === null ? null : { tipo: 'rango_numero', min, max }
}

function leerRangoFecha(def: De<'rango_fecha'>, parametros: ParametrosDeUrl): ValorDeFiltro | null {
  const [desde, hasta] = ordenar(
    fechaDe(uno(parametros, `${def.clave}.desde`)),
    fechaDe(uno(parametros, `${def.clave}.hasta`)),
  )
  return desde === null && hasta === null ? null : { tipo: 'rango_fecha', desde, hasta }
}

function leerUno(def: DefFiltro, parametros: ParametrosDeUrl): ValorDeFiltro | null {
  switch (def.tipo) {
    case 'texto':
      return leerTexto(def, parametros)
    case 'opciones':
      return leerOpciones(def, parametros)
    case 'booleano':
      return leerBooleano(def, parametros)
    case 'rango_numero':
      return leerRangoNumero(def, parametros)
    case 'rango_fecha':
      return leerRangoFecha(def, parametros)
  }
}

export function leerFiltros(
  esquema: EsquemaDeFiltros,
  parametros: ParametrosDeUrl,
): ValoresDeFiltros {
  const porClave: Record<string, ValorDeFiltro> = {}
  for (const def of esquema.filtros) {
    const valor = leerUno(def, parametros)
    if (valor !== null) {
      porClave[def.clave] = valor
    }
  }
  const busqueda = esquema.busqueda
    ? uno(parametros, esquema.busqueda.clave).slice(0, LARGO_MAXIMO_DE_TEXTO)
    : ''
  return { busqueda, porClave }
}

// Lo que hay que poner en la URL para que un filtro valga eso. `null` lo quita.
export function escribirFiltro(
  def: DefFiltro,
  valor: ValorDeFiltro | null,
): Record<string, string | null> {
  const vacio = Object.fromEntries(clavesDeFiltro(def).map((clave) => [clave, null]))
  if (valor === null) {
    return vacio
  }
  switch (valor.tipo) {
    case 'texto':
      return { [def.clave]: valor.texto.trim() === '' ? null : valor.texto }
    case 'opciones':
      return { [def.clave]: valor.valores.length === 0 ? null : valor.valores.join(',') }
    case 'booleano':
      return { [def.clave]: valor.valor ? 'si' : 'no' }
    case 'rango_numero':
      return {
        [`${def.clave}.min`]: valor.min === null ? null : String(valor.min),
        [`${def.clave}.max`]: valor.max === null ? null : String(valor.max),
      }
    case 'rango_fecha':
      return { [`${def.clave}.desde`]: valor.desde, [`${def.clave}.hasta`]: valor.hasta }
  }
}

// La URL sin ningún filtro ni búsqueda.
export function limpiarFiltros(esquema: EsquemaDeFiltros): Record<string, null> {
  return Object.fromEntries(clavesDeUrl(esquema).map((clave) => [clave, null]))
}

export function hayFiltros(valores: ValoresDeFiltros): boolean {
  return valores.busqueda !== '' || Object.keys(valores.porClave).length > 0
}

// Los filtros activos como parámetros de URL ya normalizados: es lo que guarda una vista.
export function parametrosDeFiltros(
  esquema: EsquemaDeFiltros,
  valores: ValoresDeFiltros,
): Record<string, string> {
  const parametros: Record<string, string> = {}
  if (esquema.busqueda && valores.busqueda !== '') {
    parametros[esquema.busqueda.clave] = valores.busqueda
  }
  for (const def of esquema.filtros) {
    const valor = valores.porClave[def.clave]
    if (!valor) {
      continue
    }
    for (const [clave, texto] of Object.entries(escribirFiltro(def, valor))) {
      if (texto !== null) {
        parametros[clave] = texto
      }
    }
  }
  return parametros
}
