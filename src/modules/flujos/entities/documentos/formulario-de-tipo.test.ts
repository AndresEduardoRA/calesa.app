// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { definicionSql } from '../../../../../scripts/lib/definicion-sql'
import {
  borradorConModo,
  borradorDeTipo,
  cambiosParaGuardar,
  datosParaCrear,
  validarTipo,
  BORRADOR_DE_TIPO_NUEVO,
  type BorradorDeTipo,
} from './formulario-de-tipo'
import { FORMATOS_DE_DOCUMENTO, type TipoDeDocumento } from './tipo-de-documento'

const BASE: BorradorDeTipo = { ...BORRADOR_DE_TIPO_NUEVO, nombre: 'Título' }

function conDias(modo: BorradorDeTipo['modo'], vigencia: string, aviso: string, resto = {}) {
  return { ...BASE, modo, vigenciaDias: vigencia, avisoDias: aviso, ...resto }
}

// Cada caso: lo que se escribe y, si falla, el campo y el texto que la base dice.
const CASOS: { caso: string; borrador: BorradorDeTipo }[] = [
  { caso: 'válido, sin vencimiento', borrador: BASE },
  { caso: 'nombre vacío', borrador: { ...BASE, nombre: '   ' } },
  { caso: 'nombre de 80', borrador: { ...BASE, nombre: 'n'.repeat(80) } },
  { caso: 'nombre de 81', borrador: { ...BASE, nombre: 'n'.repeat(81) } },
  { caso: 'descripción de 500', borrador: { ...BASE, descripcion: 'd'.repeat(500) } },
  { caso: 'descripción de 501', borrador: { ...BASE, descripcion: 'd'.repeat(501) } },
  { caso: 'ningún formato', borrador: { ...BASE, formatos: [] } },
  { caso: 'formato ajeno', borrador: { ...BASE, formatos: ['application/zip'] } },
  { caso: 'renovar sin vigencia', borrador: conDias('renovar', '', '') },
  { caso: 'renovar a 365 con aviso 30', borrador: conDias('renovar', '365', '30') },
  { caso: 'renovar a 3650', borrador: conDias('renovar', '3650', '') },
  { caso: 'renovar a 3651', borrador: conDias('renovar', '3651', '') },
  { caso: 'renovar a 0', borrador: conDias('renovar', '0', '') },
  { caso: 'vigencia con solicitar', borrador: conDias('solicitar', '30', '') },
  { caso: 'vigencia con ninguno', borrador: conDias('ninguno', '30', '') },
  { caso: 'aviso 0 con solicitar', borrador: conDias('solicitar', '', '0') },
  { caso: 'aviso sin vencimiento', borrador: conDias('ninguno', '', '5') },
  { caso: 'aviso mayor que la vigencia', borrador: conDias('renovar', '30', '31') },
  { caso: 'aviso igual a la vigencia', borrador: conDias('renovar', '30', '30') },
  { caso: 'aviso de 3651', borrador: conDias('solicitar', '', '3651') },
]

function aJson(b: BorradorDeTipo) {
  const dias = (t: string) => (t.trim() === '' ? null : Number(t))
  return {
    nombre: b.nombre.trim(),
    descripcion: b.descripcion,
    formatos: b.formatos,
    modo_vencimiento: b.modo,
    vigencia_dias: dias(b.vigenciaDias),
    aviso_dias: dias(b.avisoDias),
  }
}

// El mismo caso en `_tipo_documento_validar()` de la base (PGlite con la tabla mínima): el mismo campo en el `hint` y el mismo texto.
describe('validarTipo contra _tipo_documento_validar() de la base', () => {
  let db: PGlite

  beforeAll(async () => {
    db = new PGlite()
    await db.exec(`
      create type public.modo_vencimiento as enum ('ninguno', 'solicitar', 'renovar');
      create table public.tipos_documento (
        id uuid, flujo_id uuid, nombre text, descripcion text, activo boolean, orden integer, formatos text[],
        modo_vencimiento public.modo_vencimiento, vigencia_dias integer, aviso_dias integer, visible_portal_permitido boolean
      );`)
    await db.exec(definicionSql('_tipos_documento_formatos').texto)
    await db.exec(definicionSql('_tipo_documento_validar').texto)
  })

  afterAll(async () => {
    await db.close()
  })

  async function enLaBase(borrador: BorradorDeTipo) {
    try {
      await db.query(
        `select (public._tipo_documento_validar(
           json_populate_record(null::public.tipos_documento, $1::json), public._tipos_documento_formatos())).nombre`,
        [JSON.stringify(aJson(borrador))],
      )
      return { ok: true as const }
    } catch (error) {
      const { message, hint } = error as { message: string; hint?: string }
      return { ok: false as const, message, hint }
    }
  }

  it.each(CASOS)('$caso', async ({ borrador }) => {
    const base = await enLaBase(borrador)
    const espejo = validarTipo(borrador)
    expect(espejo.ok).toBe(base.ok)
    if (!base.ok && !espejo.ok) {
      expect(base.hint).toBeTruthy()
      expect(espejo.errores).toHaveProperty([base.hint ?? ''], base.message)
    }
  })

  it('ofrece los mismos formatos que la base y los deja en su orden', () => {
    const resultado = validarTipo({ ...BASE, formatos: ['image/webp', 'application/pdf'] })
    expect(resultado.ok && resultado.datos.formatos).toEqual(['application/pdf', 'image/webp'])
    expect(FORMATOS_DE_DOCUMENTO).toHaveLength(4)
  })
})

describe('validarTipo', () => {
  it('un día que no es un entero se rechaza con el texto del campo', () => {
    const r = validarTipo(conDias('renovar', '1.5', ''))
    expect(r.ok).toBe(false)
    expect(!r.ok && r.errores.vigencia_dias).toMatch(/entero de días, de 1 a 3650/)
    const a = validarTipo(conDias('solicitar', '', 'abc'))
    expect(!a.ok && a.errores.aviso_dias).toMatch(/entero de días, de 0 a 3650/)
  })

  it('quita espacios del nombre y vuelve nula la descripción vacía', () => {
    const r = validarTipo({ ...BASE, nombre: '  BL  ', descripcion: '  ' })
    expect(r.ok && r.datos).toMatchObject({ nombre: 'BL', descripcion: null })
  })
})

const ORIGINAL: TipoDeDocumento = {
  id: '11111111-1111-4111-8111-111111111111',
  flujoId: null,
  nombre: 'Título',
  descripcion: null,
  formatos: ['application/pdf', 'image/jpeg'],
  modo: 'renovar',
  vigenciaDias: 365,
  avisoDias: 30,
  visiblePortal: false,
  activo: true,
  orden: 10,
  actualizadoEn: '2026-11-11T19:52:59.123456+00:00',
}

function datos(borrador: BorradorDeTipo) {
  const r = validarTipo(borrador)
  if (!r.ok) {
    throw new Error('el borrador de la prueba tiene que ser válido')
  }
  return r.datos
}

describe('cambiosParaGuardar', () => {
  it('un borrador sin cambios no manda nada', () => {
    expect(cambiosParaGuardar(ORIGINAL, datos(borradorDeTipo(ORIGINAL)))).toBeNull()
  })

  it('manda sólo lo que cambió, y nunca proposito, orden ni flujo_id', () => {
    const cambios = cambiosParaGuardar(
      ORIGINAL,
      datos({ ...borradorDeTipo(ORIGINAL), nombre: 'Título de propiedad', visiblePortal: true }),
    )
    expect(cambios).toEqual({ nombre: 'Título de propiedad', visible_portal_permitido: true })
  })

  it('al pasar a «no vence» vacía los días que ya no se usan', () => {
    const borrador = borradorConModo(borradorDeTipo(ORIGINAL), 'ninguno')
    expect(cambiosParaGuardar(ORIGINAL, datos(borrador))).toEqual({
      modo_vencimiento: 'ninguno',
      vigencia_dias: null,
      aviso_dias: null,
    })
  })

  it('manda la lista de formatos cuando cambia y activo cuando se apaga', () => {
    const cambios = cambiosParaGuardar(
      ORIGINAL,
      datos({ ...borradorDeTipo(ORIGINAL), formatos: ['image/png'], activo: false }),
    )
    expect(cambios).toEqual({ formatos: ['image/png'], activo: false })
  })
})

describe('borradorConModo', () => {
  it('«solicitar» conserva el aviso y vacía la vigencia; «ninguno» vacía los dos', () => {
    const renovar = borradorDeTipo(ORIGINAL)
    expect(borradorConModo(renovar, 'solicitar')).toMatchObject({
      vigenciaDias: '',
      avisoDias: '30',
    })
    expect(borradorConModo(renovar, 'ninguno')).toMatchObject({ vigenciaDias: '', avisoDias: '' })
    expect(borradorConModo(renovar, 'renovar')).toMatchObject({
      vigenciaDias: '365',
      avisoDias: '30',
    })
  })
})

describe('datosParaCrear', () => {
  it('manda sólo las claves que la base acepta al crear', () => {
    const pedido = datosParaCrear(datos(borradorDeTipo(ORIGINAL)))
    expect(Object.keys(pedido).sort()).toEqual(
      [
        'aviso_dias',
        'descripcion',
        'formatos',
        'modo_vencimiento',
        'nombre',
        'vigencia_dias',
        'visible_portal_permitido',
      ].sort(),
    )
    expect(pedido).toMatchObject({ vigencia_dias: 365, aviso_dias: 30 })
  })
})
