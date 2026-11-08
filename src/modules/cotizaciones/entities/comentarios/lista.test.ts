import { describe, expect, it } from 'vitest'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import type { Comentario, ComentarioRaiz } from './comentario'
import {
  aplicarBorrado,
  buscarComentario,
  cargados,
  cursorDeUnDia,
  enElTopeDeComentarios,
  listaDesdePagina,
  reemplazarComentario,
  sumarComentario,
  sumarPaginaDeRaices,
  sumarPaginaDeRespuestas,
} from './lista'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function item(n: number, creadoEn: string, extra: Partial<Comentario> = {}): Comentario {
  return {
    id: id(n),
    autor: { id: id(900), nombre: 'Ana' },
    cuerpo: `c${String(n)}`,
    creadoEn,
    actualizadoEn: creadoEn,
    editado: false,
    eliminado: false,
    mio: true,
    ...extra,
  }
}

function raiz(
  n: number,
  creadoEn: string,
  respuestas: Comentario[] = [],
  extra: Partial<ComentarioRaiz> = {},
): ComentarioRaiz {
  return { ...item(n, creadoEn), respuestas, hayMasRespuestas: false, ...extra }
}

const pagina = (comentarios: ComentarioRaiz[], hayMas = false) => ({
  comentarios,
  hayMas,
  puedeModerar: false,
})

describe('las raíces por página', () => {
  it('suma la página siguiente al final, sin repetir una raíz que ya estaba, y mueve el cursor', () => {
    const primera = listaDesdePagina(
      pagina([raiz(3, '2026-11-08T12:00:03+00:00'), raiz(2, '2026-11-08T12:00:02+00:00')], true),
    )
    expect(primera.cursor).toEqual({ antesEn: '2026-11-08T12:00:02+00:00', antesId: id(2) })
    const segunda = sumarPaginaDeRaices(
      primera,
      pagina([raiz(2, '2026-11-08T12:00:02+00:00'), raiz(1, '2026-11-08T12:00:01+00:00')]),
    )
    expect(segunda.raices.map((r) => r.id)).toEqual([id(3), id(2), id(1)])
    expect(segunda.hayMas).toBe(false)
    expect(segunda.cursor).toEqual({ antesEn: '2026-11-08T12:00:01+00:00', antesId: id(1) })
  })

  it('comentar pone la raíz primera y no mueve el cursor', () => {
    const lista = listaDesdePagina(pagina([raiz(1, '2026-11-08T12:00:01+00:00')], true))
    const con = sumarComentario(lista, item(9, '2026-11-08T13:00:00+00:00'), null)
    expect(con.raices.map((r) => r.id)).toEqual([id(9), id(1)])
    expect(con.cursor).toEqual(lista.cursor)
  })
})

describe('las respuestas', () => {
  it('responder y luego «Ver más respuestas» que la trae otra vez: queda una, en su lugar', () => {
    const r1 = item(11, '2026-11-08T12:00:00.100001+00:00')
    const lista = listaDesdePagina(
      pagina([raiz(1, '2026-11-08T11:00:00+00:00', [r1], { hayMasRespuestas: true })]),
    )
    // La recién escrita es la más nueva; entre las dos hay otra que todavía no se trajo (mismo milisegundo, otro microsegundo).
    const nueva = item(13, '2026-11-08T12:00:05+00:00')
    const respondida = sumarComentario(lista, nueva, id(1))
    const r2 = item(12, '2026-11-08T12:00:00.100002+00:00')
    const traida = sumarPaginaDeRespuestas(respondida, id(1), {
      respuestas: [r2, nueva],
      hayMas: false,
    })
    const [primera] = traida.raices
    expect(primera?.respuestas.map((r) => r.id)).toEqual([id(11), id(12), id(13)])
    expect(primera?.hayMasRespuestas).toBe(false)
    expect(primera?.cursorDeRespuestas).toEqual({
      despuesEn: '2026-11-08T12:00:05+00:00',
      despuesId: id(13),
    })
  })

  it('editar reemplaza el texto y la versión; la raíz conserva sus respuestas', () => {
    const lista = listaDesdePagina(
      pagina([raiz(1, '2026-11-08T11:00:00+00:00', [item(2, '2026-11-08T11:30:00+00:00')])]),
    )
    const editada = reemplazarComentario(lista, {
      ...item(1, '2026-11-08T11:00:00+00:00'),
      cuerpo: 'otro',
      actualizadoEn: '2026-11-08T14:00:00+00:00',
      editado: true,
    })
    expect(editada.raices[0]?.cuerpo).toBe('otro')
    expect(editada.raices[0]?.respuestas).toHaveLength(1)
    expect(buscarComentario(editada, id(1))?.comentario.actualizadoEn).toBe(
      '2026-11-08T14:00:00+00:00',
    )
  })
})

describe('borrar, como la base', () => {
  const conRespuesta = (hayMasRespuestas = false) =>
    listaDesdePagina(
      pagina([
        raiz(1, '2026-11-08T11:00:00+00:00', [item(2, '2026-11-08T11:30:00+00:00')], {
          hayMasRespuestas,
        }),
      ]),
    )

  it('«eliminado» y «sin_cambios» dejan la raíz sin texto ni «editado», con sus respuestas', () => {
    for (const resultado of ['eliminado', 'sin_cambios'] as const) {
      const lista = aplicarBorrado(conRespuesta(), id(1), resultado)
      expect(lista.raices[0]).toMatchObject({ eliminado: true, cuerpo: null, editado: false })
      expect(lista.raices[0]?.respuestas).toHaveLength(1)
    }
  })

  it('la última respuesta de una raíz eliminada se la lleva; con más por traer, la raíz queda', () => {
    const sinMas = aplicarBorrado(
      aplicarBorrado(conRespuesta(), id(1), 'eliminado'),
      id(2),
      'borrado',
    )
    expect(sinMas.raices).toHaveLength(0)
    const conMas = aplicarBorrado(
      aplicarBorrado(conRespuesta(true), id(1), 'eliminado'),
      id(2),
      'borrado',
    )
    expect(conMas.raices.map((r) => r.id)).toEqual([id(1)])
  })

  it('borrar una raíz viva sin respuestas la quita', () => {
    const lista = listaDesdePagina(pagina([raiz(1, '2026-11-08T11:00:00+00:00')]))
    expect(aplicarBorrado(lista, id(1), 'borrado').raices).toHaveLength(0)
  })
})

describe('el tope y el camino a lo antiguo', () => {
  it('cuenta raíces y respuestas, y al llegar al tope no ofrece más', () => {
    const respuestas = Array.from({ length: 19 }, (_, i) =>
      item(1000 + i, `2026-11-08T12:00:${String(i).padStart(2, '0')}+00:00`),
    )
    const raices = Array.from({ length: TOPE_DE_LO_CARGADO / 20 }, (_, i) =>
      raiz(i + 1, `2026-11-07T12:00:${String(i).padStart(2, '0')}+00:00`, respuestas),
    )
    const lista = listaDesdePagina(pagina(raices, true))
    expect(cargados(lista)).toBe(TOPE_DE_LO_CARGADO)
    expect(enElTopeDeComentarios(lista)).toBe(true)
    const uno = listaDesdePagina(pagina([raiz(1, '2026-11-07T12:00:00+00:00')], true))
    expect(enElTopeDeComentarios(uno)).toBe(false)
  })

  it('el cursor de un día es el inicio del día siguiente en la zona, con el uuid nulo', () => {
    expect(cursorDeUnDia('2026-11-05', 'America/La_Paz')).toEqual({
      antesEn: '2026-11-06T04:00:00.000Z',
      antesId: '00000000-0000-0000-0000-000000000000',
    })
  })
})
