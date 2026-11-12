import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import {
  PESTANAS,
  pestanaDe,
  pestanasConPermiso,
  pestanasVisibles,
  permisosDeLasLlenas,
  type PestanaDeWeb,
} from './pestanas'

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' }))
const claves = (lista: readonly { clave: string }[]) => lista.map((pestana) => pestana.clave)

// Una lista como la que dejan los pasos siguientes: «Ajustes» (8.01-4) y «Preguntas frecuentes» (8.02) llenas.
const CON_DOS_LLENAS: readonly PestanaDeWeb[] = PESTANAS.map((pestana) => ({
  ...pestana,
  llena: pestana.clave === 'ajustes' || pestana.clave === 'faqs',
}))

describe('pestañas de Configuración › Sitio web', () => {
  it('son las cinco de la fila, en su orden, y hoy «Ajustes», «Legales», «Guías», «Preguntas frecuentes» y «Testimonios» están llenas', () => {
    expect(claves(PESTANAS)).toEqual(['ajustes', 'legales', 'guias', 'faqs', 'testimonios'])
    const todas = con('web.ajustes.gestionar', 'web.contenido.gestionar')
    expect(claves(pestanasVisibles(todas))).toEqual([
      'ajustes',
      'legales',
      'guias',
      'faqs',
      'testimonios',
    ])
    expect(permisosDeLasLlenas()).toEqual(['web.ajustes.gestionar', 'web.contenido.gestionar'])
  })

  it('cada clave abre sólo sus pestañas llenas, en orden', () => {
    expect(claves(pestanasVisibles(con('web.ajustes.gestionar'), CON_DOS_LLENAS))).toEqual([
      'ajustes',
    ])
    expect(claves(pestanasVisibles(con('web.contenido.gestionar'), CON_DOS_LLENAS))).toEqual([
      'faqs',
    ])
    expect(
      claves(
        pestanasVisibles(con('web.contenido.gestionar', 'web.ajustes.gestionar'), CON_DOS_LLENAS),
      ),
    ).toEqual(['ajustes', 'faqs'])
    expect(pestanasVisibles(con('web.cola.gestionar'), CON_DOS_LLENAS)).toEqual([])
    expect(pestanasVisibles([], CON_DOS_LLENAS)).toEqual([])
  })

  it('la clave en un origen también abre la pestaña', () => {
    const enUnOrigen: Permisos = [
      {
        clave: 'web.ajustes.gestionar',
        origenId: '7c1f3a52-9d1e-4f0b-8a3c-2e5d6f7a8b9c',
        alcance: 'todos',
      },
    ]
    expect(claves(pestanasVisibles(enUnOrigen, CON_DOS_LLENAS))).toEqual(['ajustes'])
  })

  it('separa «sin permiso» de «nada que configurar»: el permiso no mira si está llena', () => {
    expect(claves(pestanasConPermiso(con('web.contenido.gestionar')))).toEqual([
      'guias',
      'faqs',
      'testimonios',
    ])
    expect(claves(pestanasConPermiso(con('web.ajustes.gestionar')))).toEqual(['ajustes', 'legales'])
    expect(pestanasConPermiso(con('web.cola.gestionar'))).toEqual([])
  })

  it('la tarjeta del hub se abre con las claves de las llenas, sin repetir', () => {
    expect(permisosDeLasLlenas(CON_DOS_LLENAS)).toEqual([
      'web.ajustes.gestionar',
      'web.contenido.gestionar',
    ])
    const soloAjustesYLegales = PESTANAS.map((pestana) => ({
      ...pestana,
      llena: pestana.clave === 'ajustes' || pestana.clave === 'legales',
    }))
    expect(permisosDeLasLlenas(soloAjustesYLegales)).toEqual(['web.ajustes.gestionar'])
  })

  it('lo ajeno en la URL abre la primera visible', () => {
    const visibles = [{ clave: 'ajustes' }, { clave: 'faqs' }] as const
    expect(pestanaDe('faqs', visibles)).toBe('faqs')
    expect(pestanaDe('basura', visibles)).toBe('ajustes')
    expect(pestanaDe('guias', visibles)).toBe('ajustes')
    expect(pestanaDe(undefined, visibles)).toBe('ajustes')
  })
})
