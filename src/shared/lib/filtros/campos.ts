// Los filtros que salen de los campos configurables de un layout (vehículos y leads): qué filtro
// le toca a cada tipo y qué condición pide un valor filtrado. Sin módulos y sin I/O: quien los
// usa pone lo fijo de su listado (fase, origen, alcance) y delega acá lo que sale del layout.
import { diaSiguiente, inicioDelDia } from '../fechas'
import type { OpcionDeCampo, TipoDeCampo } from '../campos/tipos'
import type { DefFiltro, ValorDeFiltro } from './esquema'

// Lo que hace falta de un campo para filtrarlo. `filtrable` y `activo` son del layout.
export type CampoFiltrable = {
  clave: string
  etiqueta: string
  tipo: TipoDeCampo
  opciones: readonly OpcionDeCampo[]
  filtrable: boolean
  // Un campo desactivado no se filtra; su dato se conserva.
  activo: boolean
}

const NUMERO_MAXIMO = 1_000_000_000_000

type Base = { clave: string; etiqueta: string }

// Sin opciones configuradas no hay nada que elegir: no se ofrece.
const deOpciones = (base: Base, campo: CampoFiltrable): DefFiltro | null =>
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
  (base: Base, campo: CampoFiltrable) => DefFiltro | null
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
  correo: deTexto,
  documento: deTexto,
}

// El filtro de un campo, con su clave de URL (`prefijo` + clave del campo): una clave de campo no
// lleva punto, así que con un prefijo propio nunca choca con un filtro fijo ni con `cursor`.
export function filtroDeCampo(campo: CampoFiltrable, prefijo: string): DefFiltro | null {
  return FILTRO_POR_TIPO[campo.tipo](
    { clave: prefijo + campo.clave, etiqueta: campo.etiqueta },
    campo,
  )
}

// Los campos del layout que hoy se pueden filtrar.
export function camposFiltrables<Campo extends CampoFiltrable>(campos: readonly Campo[]): Campo[] {
  return campos.filter(
    (campo) => campo.activo && campo.filtrable && filtroDeCampo(campo, '') !== null,
  )
}

// Lo que se le pide a la base sobre `atributos`, sin decir cómo: `lib/supabase/consultas.ts` lo
// traduce.
export type CondicionDeAtributo =
  // `atributos` contiene alguno de estos objetos (`@>`).
  | { tipo: 'atributos_contienen'; alternativas: Record<string, string | boolean | string[]>[] }
  | { tipo: 'atributo_rango_numero'; clave: string; min: number | null; max: number | null }
  // Compara como texto: una fecha ISO ordena igual que su instante. `antesDe` es exclusivo.
  | { tipo: 'atributo_rango_texto'; clave: string; desde: string | null; antesDe: string | null }
  | { tipo: 'atributo_texto'; clave: string; texto: string }

// «Hasta el 13 inclusive» = antes del 14. Una fecha con hora se guarda en UTC: el día empieza a
// la medianoche de la empresa.
function rangoDeFecha(
  campo: CampoFiltrable,
  valor: Extract<ValorDeFiltro, { tipo: 'rango_fecha' }>,
  zona: string | undefined,
): CondicionDeAtributo {
  const conHora = campo.tipo === 'fecha_hora'
  const borde = (dia: string) => (conHora ? inicioDelDia(dia, { zona }) : dia)
  return {
    tipo: 'atributo_rango_texto',
    clave: campo.clave,
    desde: valor.desde === null ? null : borde(valor.desde),
    antesDe: valor.hasta === null ? null : borde(diaSiguiente(valor.hasta)),
  }
}

// La condición de un valor filtrado en un campo del layout. La clave sale siempre del layout
// (nunca de la URL).
export function condicionDeCampo(
  campo: CampoFiltrable,
  valor: ValorDeFiltro,
  zona: string | undefined,
): CondicionDeAtributo | null {
  const { clave } = campo
  switch (valor.tipo) {
    case 'opciones':
      // Una opción elegida de un campo de varias: el registro la tiene entre las suyas.
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
