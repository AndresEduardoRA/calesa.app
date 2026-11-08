// El catálogo de tonos de la empresa (D7, 4.22-4): lo puro de crear y guardar uno. Espejo de `_tono_nombre()`, `_tono_colores()` y de los topes de `tono_crear()`
// (`…20261028180656_base.sql`, probados con `supabase/tests/tonos.sql` y el corpus de contraste): los motivos que la pantalla da antes de enviar son los mismos textos que da la
// base, así que quien los lea no ve dos frases distintas para lo mismo. La base sigue siendo la autoridad: lo que esto deja pasar, ella lo vuelve a decidir.
import { CONTRASTE_AA, contraste, esHex } from '@/shared/lib/color'

export const TEMAS_DE_UN_TONO = ['claro', 'oscuro'] as const
export const COLORES_DE_UN_TEMA = ['fondo', 'borde', 'tinta'] as const

// Los topes los pone la base (`_tonos_tope()`, `_tono_nombre()`): son copias, y la lista de la base trae el tope vigente.
export const TOPE_DE_TONOS = 24
export const LARGO_MAXIMO_DEL_NOMBRE_DE_TONO = 40

export const MOTIVO_SIN_PERMISO_DE_TONOS = 'No tienes permiso para configurar los tonos.'

export type TemaDeUnTono = (typeof TEMAS_DE_UN_TONO)[number]
export type ColorDeUnTema = (typeof COLORES_DE_UN_TEMA)[number]
export type ColoresDeUnTema = Record<ColorDeUnTema, string>
export type ColoresDeUnTono = Record<TemaDeUnTono, ColoresDeUnTema>

export type Tono = {
  id: string
  // La clave sale del nombre al crearlo y no cambia (la nombran los grupos de una fórmula).
  clave: string
  nombre: string
  // La versión: guardar y eliminar la mandan.
  actualizadoEn: string
  colores: ColoresDeUnTono
}

export type ListaDeTonos = { tope: number; tonos: Tono[] }

// Una paleta de partida que ya pasa AA en los dos temas (la de `supabase/tests/tonos.sql`).
export function coloresDeUnTonoNuevo(): ColoresDeUnTono {
  return {
    claro: { fondo: '#fff7d6', borde: '#e9d27a', tinta: '#1b2130' },
    oscuro: { fondo: '#3e3f3c', borde: '#797251', tinta: '#f2f4f8' },
  }
}

// Como `_tono_nombre()`: espacios recortados y colapsados.
export function normalizarNombreDeTono(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim()
}

// `#rrggbb` en minúsculas, o nada si no se escribió así.
export function normalizarColor(texto: string): string | null {
  const color = texto.trim().toLowerCase()
  return esHex(color) ? color : null
}

// La razón con un decimal, truncada y con coma (como el texto de la base): 3,24 se dice «3,2», nunca «3,3».
function razonEnTexto(razon: number): string {
  const decimas = Math.floor(razon * 10)
  return `${Math.floor(decimas / 10)},${decimas % 10}`
}

export type ContrasteDeUnTema = { razon: number; cumple: boolean; texto: string }

// El contraste de la tinta sobre el fondo de un tema, para la línea en vivo; nada mientras un hex está a medio escribir.
export function contrasteDeUnTema(
  tema: TemaDeUnTono,
  colores: Pick<ColoresDeUnTema, 'fondo' | 'tinta'>,
): ContrasteDeUnTema | null {
  const fondo = normalizarColor(colores.fondo)
  const tinta = normalizarColor(colores.tinta)
  if (fondo === null || tinta === null) return null
  const razon = contraste(tinta, fondo)
  const cumple = razon >= CONTRASTE_AA
  const texto = cumple
    ? `Contraste ${razonEnTexto(razon)}:1: cumple AA.`
    : `En el tema ${tema} la tinta sobre el fondo da ${razonEnTexto(razon)}:1 y hace falta 4,5:1.`
  return { razon, cumple, texto }
}

export type PedidoDeValidarTono = {
  nombre: string
  colores: ColoresDeUnTono
  // Los tonos que hay, para el nombre repetido y el tope.
  tonos: readonly Tono[]
  tope?: number
  // El que se edita (no cuenta contra sí mismo ni contra el tope), o nada al crear.
  original: Tono | null
}

export type TonoValidado =
  | { ok: true; nombre: string; colores: ColoresDeUnTono }
  // El motivo por campo: `nombre`, `claro.fondo`… (un hex mal escrito) y `claro` | `oscuro` (el AA).
  | { ok: false; motivos: Record<string, string> }

function motivoDelNombre(
  nombre: string,
  { tonos, tope = TOPE_DE_TONOS, original }: PedidoDeValidarTono,
): string | null {
  if (nombre === '') return 'Escribe el nombre del tono.'
  if (nombre.length > LARGO_MAXIMO_DEL_NOMBRE_DE_TONO) {
    return `El nombre del tono admite hasta ${LARGO_MAXIMO_DEL_NOMBRE_DE_TONO} caracteres.`
  }
  const minuscula = nombre.toLowerCase()
  const repetido = tonos.some(
    (t) => t.id !== original?.id && normalizarNombreDeTono(t.nombre).toLowerCase() === minuscula,
  )
  if (repetido) return `Ya hay un tono «${nombre}».`
  if (original === null && tonos.length >= tope) {
    return `Ya hay ${tope} tonos, que es el máximo. Elimina uno que ningún grupo use.`
  }
  return null
}

// Valida lo escrito como lo haría la base; devuelve el nombre y los colores ya normalizados, o todos los motivos a la vez.
export function validarTono(pedido: PedidoDeValidarTono): TonoValidado {
  const nombre = normalizarNombreDeTono(pedido.nombre)
  const motivos: Record<string, string> = {}
  const motivoDelNombreDado = motivoDelNombre(nombre, pedido)
  if (motivoDelNombreDado) motivos['nombre'] = motivoDelNombreDado
  const colores = coloresDeUnTonoNuevo()
  for (const tema of TEMAS_DE_UN_TONO) {
    for (const color of COLORES_DE_UN_TEMA) {
      const normal = normalizarColor(pedido.colores[tema][color])
      if (normal === null) {
        motivos[`${tema}.${color}`] =
          `El color «${tema}.${color}» tiene que escribirse como #rrggbb, por ejemplo #fff7d6.`
      } else {
        colores[tema][color] = normal
      }
    }
    // El AA sólo se mira con los tres colores del tema bien escritos.
    if (COLORES_DE_UN_TEMA.every((color) => motivos[`${tema}.${color}`] === undefined)) {
      const medido = contrasteDeUnTema(tema, colores[tema])
      if (medido && !medido.cumple) motivos[tema] = medido.texto
    }
  }
  return Object.keys(motivos).length > 0 ? { ok: false, motivos } : { ok: true, nombre, colores }
}

export type CambiosDeUnTono = { nombre?: string; colores?: ColoresDeUnTono }

const mismosColores = (a: ColoresDeUnTono, b: ColoresDeUnTono) =>
  TEMAS_DE_UN_TONO.every((tema) => COLORES_DE_UN_TEMA.every((c) => a[tema][c] === b[tema][c]))

// Sólo lo que cambió: la base no vuelve a pedir AA a unos colores que no se tocaron. Vacío = nada que guardar.
export function cambiosDeUnTono(
  original: Tono,
  validado: { nombre: string; colores: ColoresDeUnTono },
): CambiosDeUnTono {
  return {
    ...(validado.nombre === original.nombre ? {} : { nombre: validado.nombre }),
    ...(mismosColores(validado.colores, original.colores) ? {} : { colores: validado.colores }),
  }
}
