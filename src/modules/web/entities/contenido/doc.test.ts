// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { definicionSql } from '../../../../../scripts/lib/definicion-sql'
import { CASOS_DEL_DOCUMENTO } from './doc.casos'
import { escaparHtml, hrefSeguro, htmlDelDocumento, rutaDeImagenSegura } from './doc'

describe('htmlDelDocumento', () => {
  it.each(CASOS_DEL_DOCUMENTO)('$nombre', ({ documento, html, motivo }) => {
    expect(htmlDelDocumento(documento)).toEqual(
      motivo === undefined ? { ok: true, html } : { ok: false, motivo },
    )
  })

  it('nunca deja salir un script, un javascript: ni una imagen de otro host', () => {
    for (const { documento } of CASOS_DEL_DOCUMENTO) {
      const resultado = htmlDelDocumento(documento)
      if (resultado.ok) {
        expect(resultado.html).not.toMatch(/<script|javascript:|data-ruta="[^"]*:/i)
      }
    }
  })
})

describe('las piezas de la lista blanca', () => {
  it('hrefSeguro deja pasar http, https, mailto y tel, sin importar mayúsculas', () => {
    expect(hrefSeguro('HTTPS://A.COM')).toBe('HTTPS://A.COM')
    expect(hrefSeguro('tel:+591700')).toBe('tel:+591700')
    expect(hrefSeguro('JavaScript:alert(1)')).toBeNull()
    expect(hrefSeguro('https://a.com\n')).toBeNull()
  })

  it('rutaDeImagenSegura sólo admite rutas relativas del bucket', () => {
    expect(rutaDeImagenSegura('guias/a-1_b.webp')).toBe('guias/a-1_b.webp')
    expect(rutaDeImagenSegura('a//b.png')).toBeNull()
    expect(rutaDeImagenSegura(`${'a'.repeat(297)}.png`)).toBeNull()
  })

  it('escaparHtml escapa los cinco caracteres', () => {
    expect(escaparHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    )
  })
})

// La base es la fuente: las mismas funciones SQL, la misma tabla de casos, el mismo resultado.
describe('contra _web_doc_html() de la base', () => {
  let db: PGlite
  const FUNCIONES = [
    '_seguimiento_href_valido',
    '_web_html_escapar',
    '_web_doc_ruta_valida',
    '_web_doc_marcas',
    '_web_doc_imagen',
    '_web_doc_nodo',
    '_web_doc_html',
  ]

  beforeAll(async () => {
    db = new PGlite()
    for (const nombre of FUNCIONES) await db.exec(definicionSql(nombre).texto)
  })

  afterAll(async () => {
    await db.close()
  })

  async function enLaBase(documento: unknown) {
    try {
      const { rows } = await db.query<{ h: string }>(
        'select public._web_doc_html($1::jsonb) as h',
        [documento === null ? null : JSON.stringify(documento)],
      )
      return { ok: true as const, html: rows[0]?.h }
    } catch (error) {
      return { ok: false as const, motivo: (error as Error).message }
    }
  }

  it.each(CASOS_DEL_DOCUMENTO)('$nombre', async ({ documento, html, motivo }) => {
    expect(await enLaBase(documento)).toEqual(
      motivo === undefined ? { ok: true, html } : { ok: false, motivo },
    )
  })
})
