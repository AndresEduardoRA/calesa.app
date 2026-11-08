// Los comentarios cargados en la pantalla (4.27-2), puro. Las raíces van de la más nueva a la más vieja y las respuestas de cada una en orden de llegada, como las
// lee la base. Lo que se suma (una página, un comentario recién escrito) nunca repite un id. Borrar copia lo que hace `cotizacion_comentario_borrar`: una raíz con
// respuestas queda eliminada y se va con su última respuesta. Los cursores son los de la última fila que vino de la base, con su fecha tal cual (texto).
import { inicioDelDia, diaSiguiente } from '@/shared/lib/fechas'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import type {
  Comentario,
  ComentarioRaiz,
  PaginaDeComentarios,
  PaginaDeRespuestas,
  ResultadoDeBorrar,
} from './comentario'

export type CursorDeRaices = { antesEn: string; antesId: string }
export type CursorDeRespuestas = { despuesEn: string; despuesId: string }

export type RaizCargada = ComentarioRaiz & { cursorDeRespuestas: CursorDeRespuestas | null }

export type ListaDeComentarios = {
  raices: RaizCargada[]
  hayMas: boolean
  cursor: CursorDeRaices | null
}

export const LISTA_VACIA: ListaDeComentarios = { raices: [], hayMas: false, cursor: null }

// Ningún uuid es menor que el nulo: con él, el cursor de un día trae ese día entero y lo anterior.
const UUID_NULO = '00000000-0000-0000-0000-000000000000'

// Un instante de la base («2026-11-08T05:31:19.12345+00:00») como microsegundos, para ordenar sin perder lo que `Date` corta.
function microsegundos(iso: string): number {
  const fraccion = /\.(\d+)/.exec(iso)?.[1] ?? ''
  const sinFraccion = iso.replace(/\.\d+/, '')
  return Date.parse(sinFraccion) * 1000 + Number(fraccion.padEnd(6, '0').slice(0, 6))
}

// El orden de la base, `(creado_en, id)`.
function compararLlegada(a: Comentario, b: Comentario): number {
  const diferencia = microsegundos(a.creadoEn) - microsegundos(b.creadoEn)
  if (diferencia !== 0) {
    return diferencia
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

function ultimoCursorDeRespuestas(respuestas: readonly Comentario[]): CursorDeRespuestas | null {
  const ultima = respuestas.at(-1)
  return ultima ? { despuesEn: ultima.creadoEn, despuesId: ultima.id } : null
}

function deRaiz(raiz: ComentarioRaiz): RaizCargada {
  return { ...raiz, cursorDeRespuestas: ultimoCursorDeRespuestas(raiz.respuestas) }
}

function sumarSinRepetir(
  actuales: readonly Comentario[],
  nuevas: readonly Comentario[],
): Comentario[] {
  const vistos = new Set(actuales.map((c) => c.id))
  return [...actuales, ...nuevas.filter((c) => !vistos.has(c.id))].sort(compararLlegada)
}

// La primera página (al entrar, al recargar, al ir a una fecha): reemplaza lo cargado.
export function listaDesdePagina(pagina: PaginaDeComentarios): ListaDeComentarios {
  const ultima = pagina.comentarios.at(-1)
  return {
    raices: pagina.comentarios.map(deRaiz),
    hayMas: pagina.hayMas,
    cursor: ultima ? { antesEn: ultima.creadoEn, antesId: ultima.id } : null,
  }
}

// «Ver más comentarios»: suma al final las raíces que no estaban.
export function sumarPaginaDeRaices(
  lista: ListaDeComentarios,
  pagina: PaginaDeComentarios,
): ListaDeComentarios {
  const vistas = new Set(lista.raices.map((r) => r.id))
  const ultima = pagina.comentarios.at(-1)
  return {
    raices: [...lista.raices, ...pagina.comentarios.filter((r) => !vistas.has(r.id)).map(deRaiz)],
    hayMas: pagina.hayMas,
    cursor: ultima ? { antesEn: ultima.creadoEn, antesId: ultima.id } : lista.cursor,
  }
}

function conRaiz(
  lista: ListaDeComentarios,
  raizId: string,
  cambiar: (raiz: RaizCargada) => RaizCargada | null,
): ListaDeComentarios {
  return {
    ...lista,
    raices: lista.raices.flatMap((raiz) => {
      if (raiz.id !== raizId) {
        return [raiz]
      }
      const cambiada = cambiar(raiz)
      return cambiada ? [cambiada] : []
    }),
  }
}

// «Ver más respuestas» de una raíz: las suma en su lugar, sin repetir la que ya estaba (una recién escrita).
export function sumarPaginaDeRespuestas(
  lista: ListaDeComentarios,
  raizId: string,
  pagina: PaginaDeRespuestas,
): ListaDeComentarios {
  return conRaiz(lista, raizId, (raiz) => ({
    ...raiz,
    respuestas: sumarSinRepetir(raiz.respuestas, pagina.respuestas),
    hayMasRespuestas: pagina.hayMas,
    cursorDeRespuestas: ultimoCursorDeRespuestas(pagina.respuestas) ?? raiz.cursorDeRespuestas,
  }))
}

// Lo que devolvió comentar: una raíz va primera; una respuesta, a su raíz en su lugar. No mueve ningún cursor (no vino de una página).
export function sumarComentario(
  lista: ListaDeComentarios,
  comentario: Comentario,
  padreId: string | null,
): ListaDeComentarios {
  if (padreId === null) {
    if (lista.raices.some((r) => r.id === comentario.id)) {
      return lista
    }
    const raiz: RaizCargada = {
      ...comentario,
      respuestas: [],
      hayMasRespuestas: false,
      cursorDeRespuestas: null,
    }
    return { ...lista, raices: [raiz, ...lista.raices] }
  }
  return conRaiz(lista, padreId, (raiz) => ({
    ...raiz,
    respuestas: sumarSinRepetir(raiz.respuestas, [comentario]),
  }))
}

// Lo que devolvió editar: el mismo comentario con su texto y su versión nuevos; una raíz conserva sus respuestas.
export function reemplazarComentario(
  lista: ListaDeComentarios,
  comentario: Comentario,
): ListaDeComentarios {
  return {
    ...lista,
    raices: lista.raices.map((raiz) =>
      raiz.id === comentario.id
        ? { ...raiz, ...comentario }
        : {
            ...raiz,
            respuestas: raiz.respuestas.map((r) => (r.id === comentario.id ? comentario : r)),
          },
    ),
  }
}

function eliminada(raiz: RaizCargada): RaizCargada {
  return { ...raiz, cuerpo: null, editado: false, eliminado: true }
}

// Lo que devolvió borrar. `borrado` quita la fila (y una raíz eliminada que se queda sin respuestas, si no hay más por traer); `eliminado` y `sin_cambios`
// (otra persona ya la había eliminado) dejan la raíz sin texto, con sus respuestas.
export function aplicarBorrado(
  lista: ListaDeComentarios,
  comentarioId: string,
  resultado: ResultadoDeBorrar,
): ListaDeComentarios {
  const raiz = lista.raices.find((r) => r.id === comentarioId)
  if (raiz) {
    return conRaiz(lista, raiz.id, (r) => (resultado === 'borrado' ? null : eliminada(r)))
  }
  const deLaRespuesta = lista.raices.find((r) => r.respuestas.some((x) => x.id === comentarioId))
  if (!deLaRespuesta) {
    return lista
  }
  return conRaiz(lista, deLaRespuesta.id, (r) => {
    const respuestas = r.respuestas.filter((x) => x.id !== comentarioId)
    if (r.eliminado && respuestas.length === 0 && !r.hayMasRespuestas) {
      return null
    }
    return { ...r, respuestas }
  })
}

// Un comentario cargado por su id, la raíz donde está (él mismo, si es una raíz) y si es una raíz.
export function buscarComentario(
  lista: ListaDeComentarios,
  comentarioId: string,
): { comentario: Comentario; raiz: RaizCargada; esRaiz: boolean } | null {
  for (const raiz of lista.raices) {
    if (raiz.id === comentarioId) {
      return { comentario: raiz, raiz, esRaiz: true }
    }
    const respuesta = raiz.respuestas.find((r) => r.id === comentarioId)
    if (respuesta) {
      return { comentario: respuesta, raiz, esRaiz: false }
    }
  }
  return null
}

// Raíces más respuestas: lo que está dibujado.
export function cargados(lista: ListaDeComentarios): number {
  return lista.raices.reduce((suma, raiz) => suma + 1 + raiz.respuestas.length, 0)
}

// Con el tope alcanzado no se ofrece «Ver más comentarios» ni «Ver más respuestas»: el camino a lo antiguo es «Ir a una fecha».
export function enElTopeDeComentarios(lista: ListaDeComentarios): boolean {
  return cargados(lista) >= TOPE_DE_LO_CARGADO
}

// «Ir a una fecha»: ese día y lo anterior, antes del inicio del día siguiente en la zona de la empresa.
export function cursorDeUnDia(dia: string, zona: string): CursorDeRaices {
  return { antesEn: inicioDelDia(diaSiguiente(dia), { zona }), antesId: UUID_NULO }
}
