// De las celdas de la persona a filas normalizadas de vehículos (9.06-4). Cada celda se lee al valor del formulario del alta (los lectores de
// la importación de `/leads`: números de otro sistema, sí o no, fechas) y la fila se valida con `validarVehiculo()`, el mismo esquema del
// formulario y de la acción del alta (D31). La base sigue siendo la última palabra, por fila. Sin I/O.
import {
  comparable,
  convertirNumero,
  convertirSiONo,
  fechaHoraLocal,
  fechaIso,
  MOTIVO_DE_FECHA,
  MOTIVO_DE_FECHA_HORA,
  sinApostrofoDeFormula,
  type Conversion,
  type ObjetivoDeImportacion,
} from '@/modules/leads/client'
import {
  claveDeAtributo,
  validarVehiculo,
  type CampoComun,
  type CampoDeVehiculo,
  type ClaveComun,
  type Fuentes,
} from '@/modules/vehiculos/client'
import { vacioDe, type ValoresDeFormulario } from '@/shared/lib/campos'
import type { FilaNormalizada, ValorDeCelda } from '../../entities/plantillas'
import { rechazoDeMotivos, type MotivoConCampo } from './rechazo'

// La columna de la plantilla de cada dato común. Un `ClaveComun` nuevo no compila hasta tener la suya.
const CLAVE_EN_LA_PLANTILLA: Record<ClaveComun, string> = {
  titulo: 'titulo',
  marca: 'marca',
  modelo: 'modelo',
  anio: 'anio',
  vin: 'vin',
  categoriaId: 'categoria_id',
  kilometraje: 'kilometraje',
  placado: 'placado',
  lote: 'lote',
  plataforma: 'plataforma',
  urlOrigen: 'url_origen',
  precio: 'precio',
  precioNegociable: 'precio_negociable',
  aceptaPermuta: 'acepta_permuta',
}

// Los comunes del tipo del origen y después los campos activos del layout, en su orden. Los encabezados de «exportar todo» se emparejan solos.
export function objetivosDeVehiculos(fuentes: Fuentes): ObjetivoDeImportacion[] {
  const comunes = fuentes.comunes.map((campo) => ({
    id: campo.clave,
    etiqueta: campo.etiqueta,
    requerido: campo.requerido === true,
    fijo: true,
    nombres: [
      comparable(campo.etiqueta),
      comparable(campo.clave),
      comparable(CLAVE_EN_LA_PLANTILLA[campo.clave]),
    ],
  }))
  const campos = fuentes.campos.map((campo) => ({
    id: claveDeAtributo(campo.clave),
    etiqueta: campo.etiqueta,
    requerido: campo.requerido,
    fijo: false,
    nombres: [comparable(campo.etiqueta), comparable(campo.clave)],
  }))
  return [...comunes, ...campos]
}

// La etiqueta de una columna de la plantilla (`precio` → «Precio»), para el rechazo de la guarda D34.
export function etiquetaDeVehiculos(fuentes: Fuentes): (clave: string) => string | undefined {
  const porClave = new Map(
    fuentes.comunes.map((campo) => [CLAVE_EN_LA_PLANTILLA[campo.clave], campo.etiqueta]),
  )
  return (clave) => porClave.get(clave)
}

const NOMBRADAS = 10

function motivoDeCategoria(texto: string, fuentes: Fuentes): string {
  const activas = fuentes.categorias.filter((una) => una.activa).map((una) => una.nombre)
  const principio = `La categoría «${texto}» no existe o está desactivada.`
  if (activas.length === 0) {
    return `${principio} No hay categorías activas: deja la celda vacía.`
  }
  const resto = activas.length - NOMBRADAS
  const nombradas = activas.slice(0, NOMBRADAS).join(', ')
  return `${principio} Las activas: ${nombradas}${resto > 0 ? ` y ${String(resto)} más` : ''}.`
}

function categoriaDe(texto: string, fuentes: Fuentes): Conversion {
  const buscada = comparable(texto)
  const categoria = fuentes.categorias.find(
    (una) => una.activa && comparable(una.nombre) === buscada,
  )
  return categoria
    ? { ok: true, valor: categoria.id }
    : { ok: false, motivo: motivoDeCategoria(texto, fuentes) }
}

function comun(campo: CampoComun, texto: string, fuentes: Fuentes): Conversion {
  if (texto === '') {
    return { ok: true, valor: campo.tipo === 'si_no' ? null : '' }
  }
  switch (campo.tipo) {
    case 'entero':
    case 'monto':
      return convertirNumero(texto, fuentes.locale)
    case 'si_no':
      return convertirSiONo(texto)
    case 'categoria':
      return categoriaDe(texto, fuentes)
    case 'texto':
    case 'vin':
    case 'enlace':
      return { ok: true, valor: texto }
  }
}

function claveDeOpcion(campo: CampoDeVehiculo, texto: string): string | null {
  const buscada = comparable(texto)
  return (
    campo.opciones.find(
      (una) => comparable(una.etiqueta) === buscada || comparable(una.clave) === buscada,
    )?.clave ?? null
  )
}

const motivoDeOpcion = (campo: CampoDeVehiculo, texto: string) =>
  `«${texto}» no es una de las opciones de «${campo.etiqueta}».`

function opciones(campo: CampoDeVehiculo, texto: string): Conversion {
  const claves: string[] = []
  for (const parte of texto.split('|')) {
    const una = parte.trim()
    if (una === '') {
      continue
    }
    const clave = claveDeOpcion(campo, una)
    if (clave === null) {
      return { ok: false, motivo: motivoDeOpcion(campo, una) }
    }
    claves.push(clave)
  }
  return { ok: true, valor: claves }
}

function conFormato(texto: string, leer: (t: string) => string | null, motivo: string): Conversion {
  const leido = leer(texto)
  return leido === null ? { ok: false, motivo } : { ok: true, valor: leido }
}

type Lector = (campo: CampoDeVehiculo, texto: string, locale: string) => Conversion

const comoTexto: Lector = (_campo, texto) => ({ ok: true, valor: texto })

const POR_TIPO: Record<CampoDeVehiculo['tipo'], Lector> = {
  numero: (_campo, texto, locale) => convertirNumero(texto, locale),
  moneda: (_campo, texto, locale) => convertirNumero(texto, locale),
  booleano: (_campo, texto) => convertirSiONo(texto),
  fecha: (_campo, texto) => conFormato(texto, fechaIso, MOTIVO_DE_FECHA),
  fecha_hora: (_campo, texto) => conFormato(texto, fechaHoraLocal, MOTIVO_DE_FECHA_HORA),
  opcion: (campo, texto) => {
    const clave = claveDeOpcion(campo, texto)
    return clave === null
      ? { ok: false, motivo: motivoDeOpcion(campo, texto) }
      : { ok: true, valor: clave }
  },
  multi_opcion: opciones,
  texto: comoTexto,
  texto_largo: comoTexto,
  url: comoTexto,
  vin: comoTexto,
  lote: comoTexto,
}

function delLayout(campo: CampoDeVehiculo, texto: string, locale: string): Conversion {
  return texto === ''
    ? { ok: true, valor: vacioDe(campo) }
    : POR_TIPO[campo.tipo](campo, texto, locale)
}

type Lectura = { valores: ValoresDeFormulario; propios: Map<string, string> }

function leerFila(
  celdas: readonly string[],
  destinos: readonly (string | null)[],
  fuentes: Fuentes,
): Lectura {
  const comunes = new Map<string, CampoComun>(fuentes.comunes.map((c) => [c.clave, c]))
  const campos = new Map(fuentes.campos.map((c) => [claveDeAtributo(c.clave), c]))
  const lectura: Lectura = { valores: {}, propios: new Map() }
  for (const [columna, destino] of destinos.entries()) {
    if (destino === null) {
      continue
    }
    const texto = sinApostrofoDeFormula(celdas[columna] ?? '').trim()
    const campoComun = comunes.get(destino)
    const campo = campos.get(destino)
    const conversion = campoComun
      ? comun(campoComun, texto, fuentes)
      : campo
        ? delLayout(campo, texto, fuentes.locale)
        : null
    if (conversion?.ok) {
      lectura.valores[destino] = conversion.valor
    } else if (conversion) {
      lectura.propios.set(destino, conversion.motivo)
    }
  }
  return lectura
}

const vacioDeCelda = (valor: unknown) =>
  valor === null || valor === '' || (Array.isArray(valor) && valor.length === 0)

function datosDe(
  comunes: Partial<Record<ClaveComun, string | number | boolean | null>>,
  atributos: Record<string, unknown>,
): Record<string, ValorDeCelda> {
  const datos: Record<string, ValorDeCelda> = {}
  for (const [clave, valor] of Object.entries(comunes) as [ClaveComun, unknown][]) {
    if (!vacioDeCelda(valor) && valor !== undefined) {
      datos[CLAVE_EN_LA_PLANTILLA[clave]] = valor as ValorDeCelda
    }
  }
  const llenos = Object.fromEntries(Object.entries(atributos).filter(([, v]) => !vacioDeCelda(v)))
  if (Object.keys(llenos).length > 0) {
    datos['atributos'] = llenos
  }
  return datos
}

export type EntradaDeVehiculos = {
  filas: readonly (readonly string[])[]
  // Por columna del archivo, el id del objetivo o `null`.
  destinos: readonly (string | null)[]
  objetivos: readonly ObjetivoDeImportacion[]
  fuentes: Fuentes
}

// Una fila normalizada por cada fila de la persona (D32), lista o con sus motivos (D33).
export function prepararVehiculos(entrada: EntradaDeVehiculos): FilaNormalizada[] {
  const etiquetas = new Map(entrada.objetivos.map((objetivo) => [objetivo.id, objetivo.etiqueta]))
  const etiquetaDe = (id: string) => etiquetas.get(id)
  return entrada.filas.map((celdas) => {
    const { valores, propios } = leerFila(celdas, entrada.destinos, entrada.fuentes)
    const validacion = validarVehiculo(entrada.fuentes, valores)
    const porCampo = new Map(validacion.ok ? [] : Object.entries(validacion.porCampo))
    // Un dato que no se pudo leer ya dice por qué: no se repite con «es obligatorio».
    for (const [campo, motivo] of propios) {
      porCampo.set(campo, motivo)
    }
    if (!validacion.ok || porCampo.size > 0) {
      const motivos: MotivoConCampo[] = [...porCampo].map(([campo, motivo]) => ({
        campo,
        motivo,
      }))
      return rechazoDeMotivos(motivos, etiquetaDe)
    }
    return { datos: datosDe(validacion.datos.comunes, validacion.datos.atributos) }
  })
}
