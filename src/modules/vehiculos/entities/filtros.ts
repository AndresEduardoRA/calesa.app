// Los filtros del inventario: unos pocos fijos, que la tabla justifica con una columna o un
// índice, y los que salen de los campos «filtrables» del layout del origen. De acá sale el esquema
// que dibuja `FilterShell` y las condiciones que `infra/` le pasa a la base.
import { diaSiguiente, inicioDelDia } from '@/shared/lib/fechas'
import type {
  DefFiltro,
  EsquemaDeFiltros,
  ValorDeFiltro,
  ValoresDeFiltros,
} from '@/shared/lib/filtros'
import {
  PREFIJO_DE_ATRIBUTO,
  camposActivos,
  type CampoDeVehiculo,
  type CategoriaDeVehiculo,
  type FaseDeVehiculo,
  type TipoDeCampo,
} from './campo'

// Las claves de URL de los fijos. Las de los campos del layout van con el prefijo `a.`: una clave
// de campo no lleva punto, así que nunca choca con `origen`, `panel`, `cursor` ni con un fijo.
export const FILTRO_FASE = 'fase'
export const FILTRO_CATEGORIA = 'categoria'
export const FILTRO_ANIO = 'anio'
// En el filtro de fase: lo que todavía no entró al flujo.
export const SIN_FASE = 'ninguna'

const BUSQUEDA = { clave: 'q', etiqueta: 'Buscar por título, VIN o lote' }
const NUMERO_MAXIMO = 1_000_000_000_000

type Fuentes = {
  campos: readonly CampoDeVehiculo[]
  fases: readonly FaseDeVehiculo[]
  categorias: readonly CategoriaDeVehiculo[]
}

type Base = { clave: string; etiqueta: string }

// Sin opciones configuradas no hay nada que elegir: no se ofrece.
const deOpciones = (base: Base, campo: CampoDeVehiculo): DefFiltro | null =>
  campo.opciones.length === 0
    ? null
    : {
        ...base,
        tipo: 'opciones',
        opciones: campo.opciones.map((o) => ({ valor: o.clave, etiqueta: o.etiqueta })),
      }
const deNumero = (base: Base): DefFiltro => ({
  ...base,
  tipo: 'rango_numero',
  minimo: -NUMERO_MAXIMO,
  maximo: NUMERO_MAXIMO,
  entero: false,
})
const deFecha = (base: Base): DefFiltro => ({ ...base, tipo: 'rango_fecha' })
const deTexto = (base: Base): DefFiltro => ({ ...base, tipo: 'texto' })

// Qué filtro le toca a cada tipo de campo.
const FILTRO_POR_TIPO: Record<
  TipoDeCampo,
  (base: Base, campo: CampoDeVehiculo) => DefFiltro | null
> = {
  opcion: deOpciones,
  multi_opcion: deOpciones,
  booleano: (base) => ({ ...base, tipo: 'booleano' }),
  numero: deNumero,
  moneda: deNumero,
  fecha: deFecha,
  fecha_hora: deFecha,
  texto: deTexto,
  texto_largo: deTexto,
  url: deTexto,
  vin: deTexto,
  lote: deTexto,
}

function filtroDeCampo(campo: CampoDeVehiculo): DefFiltro | null {
  const base = { clave: PREFIJO_DE_ATRIBUTO + campo.clave, etiqueta: campo.etiqueta }
  return FILTRO_POR_TIPO[campo.tipo](base, campo)
}

// Los campos del layout que hoy se pueden filtrar.
export function camposFiltrables<Campo extends CampoDeVehiculo>(campos: readonly Campo[]): Campo[] {
  return camposActivos(campos).filter((campo) => campo.filtrable && filtroDeCampo(campo) !== null)
}

function filtrosFijos({ fases, categorias }: Fuentes): DefFiltro[] {
  const fijos: DefFiltro[] = []
  if (fases.length > 0) {
    fijos.push({
      tipo: 'opciones',
      clave: FILTRO_FASE,
      etiqueta: 'Fase',
      opciones: [
        ...fases.map((fase) => ({ valor: fase.id, etiqueta: fase.nombre, color: fase.color })),
        { valor: SIN_FASE, etiqueta: 'Sin fase' },
      ],
    })
  }
  const activas = categorias.filter((categoria) => categoria.activa)
  if (activas.length > 0) {
    fijos.push({
      tipo: 'opciones',
      clave: FILTRO_CATEGORIA,
      etiqueta: 'Categoría',
      opciones: activas.map((categoria) => ({ valor: categoria.id, etiqueta: categoria.nombre })),
    })
  }
  fijos.push({
    tipo: 'rango_numero',
    clave: FILTRO_ANIO,
    etiqueta: 'Año',
    // Lo que admite la columna (`anio between 1900 and 2100`).
    minimo: 1900,
    maximo: 2100,
    entero: true,
    sinMiles: true,
  })
  return fijos
}

export function esquemaDeFiltros(fuentes: Fuentes): EsquemaDeFiltros {
  const delLayout = camposFiltrables(fuentes.campos).flatMap((campo) => filtroDeCampo(campo) ?? [])
  return { busqueda: BUSQUEDA, filtros: [...filtrosFijos(fuentes), ...delLayout] }
}

// Lo que se le pide a la base, sin decir cómo: `infra/queries/condiciones.ts` lo traduce.
export type Condicion =
  // Contiene el texto en el título, el VIN o el lote.
  | { tipo: 'busqueda'; texto: string }
  // La columna vale alguno de esos; `incluirNulo` suma «o no tiene».
  | {
      tipo: 'columna_en'
      columna: 'fase_id' | 'categoria_id'
      valores: string[]
      incluirNulo: boolean
    }
  | { tipo: 'columna_rango'; columna: 'anio'; min: number | null; max: number | null }
  // `atributos` contiene alguno de estos objetos (`@>`).
  | { tipo: 'atributos_contienen'; alternativas: Record<string, string | boolean | string[]>[] }
  | { tipo: 'atributo_rango_numero'; clave: string; min: number | null; max: number | null }
  // Compara como texto: una fecha ISO ordena igual que su instante. `antesDe` es exclusivo.
  | { tipo: 'atributo_rango_texto'; clave: string; desde: string | null; antesDe: string | null }
  | { tipo: 'atributo_texto'; clave: string; texto: string }

function condicionFija(clave: string, valor: ValorDeFiltro): Condicion | null {
  if (clave === FILTRO_ANIO && valor.tipo === 'rango_numero') {
    return { tipo: 'columna_rango', columna: 'anio', min: valor.min, max: valor.max }
  }
  if (valor.tipo !== 'opciones') {
    return null
  }
  if (clave === FILTRO_FASE) {
    return {
      tipo: 'columna_en',
      columna: 'fase_id',
      valores: valor.valores.filter((fase) => fase !== SIN_FASE),
      incluirNulo: valor.valores.includes(SIN_FASE),
    }
  }
  if (clave === FILTRO_CATEGORIA) {
    return {
      tipo: 'columna_en',
      columna: 'categoria_id',
      valores: valor.valores,
      incluirNulo: false,
    }
  }
  return null
}

// «Hasta el 13 inclusive» = antes del 14. Una fecha con hora se guarda en UTC: el día empieza a
// la medianoche de la empresa.
function rangoDeFecha(
  campo: CampoDeVehiculo,
  valor: Extract<ValorDeFiltro, { tipo: 'rango_fecha' }>,
  zona: string | undefined,
): Condicion {
  const conHora = campo.tipo === 'fecha_hora'
  const borde = (dia: string) => (conHora ? inicioDelDia(dia, { zona }) : dia)
  return {
    tipo: 'atributo_rango_texto',
    clave: campo.clave,
    desde: valor.desde === null ? null : borde(valor.desde),
    antesDe: valor.hasta === null ? null : borde(diaSiguiente(valor.hasta)),
  }
}

function condicionDeCampo(
  campo: CampoDeVehiculo,
  valor: ValorDeFiltro,
  zona: string | undefined,
): Condicion | null {
  const { clave } = campo
  switch (valor.tipo) {
    case 'opciones':
      // Una opción elegida de un campo de varias: el vehículo la tiene entre las suyas.
      return {
        tipo: 'atributos_contienen',
        alternativas: valor.valores.map((elegida) => ({
          [clave]: campo.tipo === 'multi_opcion' ? [elegida] : elegida,
        })),
      }
    case 'booleano':
      return { tipo: 'atributos_contienen', alternativas: [{ [clave]: valor.valor }] }
    case 'rango_numero':
      return { tipo: 'atributo_rango_numero', clave, min: valor.min, max: valor.max }
    case 'rango_fecha':
      return rangoDeFecha(campo, valor, zona)
    case 'texto':
      return { tipo: 'atributo_texto', clave, texto: valor.texto }
  }
}

// Las condiciones de lo que la persona filtró. La clave de un atributo sale siempre del layout
// (nunca de la URL): un filtro de un campo que ya no es filtrable se ignora.
export function condicionesDe(
  campos: readonly CampoDeVehiculo[],
  valores: ValoresDeFiltros,
  opciones: { zona?: string } = {},
): Condicion[] {
  const condiciones: Condicion[] = []
  if (valores.busqueda !== '') {
    condiciones.push({ tipo: 'busqueda', texto: valores.busqueda })
  }
  const porClave = new Map(
    camposFiltrables(campos).map((campo) => [PREFIJO_DE_ATRIBUTO + campo.clave, campo]),
  )
  for (const [clave, valor] of Object.entries(valores.porClave)) {
    const campo = porClave.get(clave)
    const condicion = campo
      ? condicionDeCampo(campo, valor, opciones.zona)
      : condicionFija(clave, valor)
    if (condicion) {
      condiciones.push(condicion)
    }
  }
  return condiciones
}
