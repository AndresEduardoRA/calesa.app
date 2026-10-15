import { describe, expect, it } from 'vitest'
import {
  autorDe,
  cambiosDelSeguimiento,
  conSeguimiento,
  cursorDeSeguimientos,
  documentoInicial,
  paginaDeSeguimientosDesde,
  puedeEditarSeguimiento,
  seguimientoDesde,
  sumarPagina,
  validarSeguimiento,
  type Seguimiento,
  type ValoresDelSeguimiento,
} from './seguimiento'

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const LEAD = '0b9c2f3e-1d4a-4c5b-8e6f-7a8b9c0d1e2f'
const TIPO = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f'
const OTRO_TIPO = '2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f60'
const YO = '3e4f5a6b-7c8d-4e9f-8a1b-2c3d4e5f6071'

const CRUDO = {
  id: ID,
  lead_id: LEAD,
  tipo_id: TIPO,
  tipo_nombre: 'Llamada',
  tipo_icono: 'phone',
  titulo: 'Llamó',
  detalle_doc: null,
  detalle_texto: 'Quiere un RAV4',
  visibilidad: 'privado',
  ocurrido_en: '2026-10-15T14:00:00+00:00',
  actualizado_en: '2026-10-15T14:00:00.123456+00:00',
  eliminado: false,
  autor_id: YO,
  autor_nombre: 'Berta',
  es_mio: true,
}

const uno = (cambios: Partial<Seguimiento> = {}): Seguimiento => ({
  ...(seguimientoDesde(CRUDO) as Seguimiento),
  ...cambios,
})

describe('seguimientoDesde y paginaDeSeguimientosDesde', () => {
  it('lee lo que entrega la base, con la versión tal cual', () => {
    expect(seguimientoDesde(CRUDO)).toMatchObject({
      id: ID,
      leadId: LEAD,
      tipoNombre: 'Llamada',
      detalleDoc: null,
      detalleTexto: 'Quiere un RAV4',
      visibilidad: 'privado',
      actualizadoEn: '2026-10-15T14:00:00.123456+00:00',
      esMio: true,
    })
  })
  it('una forma rota es null; en una página, la fila rota se descarta', () => {
    expect(seguimientoDesde({ ...CRUDO, visibilidad: 'portal' })).toBeNull()
    const pagina = paginaDeSeguimientosDesde({
      seguimientos: [CRUDO, { ...CRUDO, id: 'x' }],
      hay_mas: true,
      puedo_anotar: false,
    })
    expect(pagina?.seguimientos).toHaveLength(1)
    expect(pagina).toMatchObject({ hayMas: true, puedoAnotar: false })
    expect(paginaDeSeguimientosDesde({ seguimientos: [] })).toBeNull()
  })
})

describe('quién edita y cómo se nombra', () => {
  it('sólo lo mío, y sólo si puedo anotar (cartera y leads.editar)', () => {
    expect(puedeEditarSeguimiento(uno(), true)).toBe(true)
    expect(puedeEditarSeguimiento(uno(), false)).toBe(false)
    expect(puedeEditarSeguimiento(uno({ esMio: false }), true)).toBe(false)
  })
  it('«Tú», el nombre, u «Otra persona» sin nombre', () => {
    expect(autorDe(uno())).toBe('Tú')
    expect(autorDe(uno({ esMio: false }))).toBe('Berta')
    expect(autorDe(uno({ esMio: false, autorNombre: null }))).toBe('Otra persona')
  })
})

describe('la lista', () => {
  const a = uno({ id: '00000000-0000-4000-8000-00000000000a', ocurridoEn: '2026-10-15T10:00:00Z' })
  const b = uno({ id: '00000000-0000-4000-8000-00000000000b', ocurridoEn: '2026-10-15T12:00:00Z' })
  const c = uno({ id: '00000000-0000-4000-8000-00000000000c', ocurridoEn: '2026-10-15T12:00:00Z' })
  it('pone cada uno en su lugar (más reciente primero; a igual hora, el id mayor) y saca el eliminado', () => {
    expect(conSeguimiento([a], b).map((s) => s.id)).toEqual([b.id, a.id])
    expect(conSeguimiento([b, a], c).map((s) => s.id)).toEqual([c.id, b.id, a.id])
    expect(conSeguimiento([b, a], { ...b, titulo: 'Otro' })[0]?.titulo).toBe('Otro')
    expect(conSeguimiento([b, a], { ...b, eliminado: true }).map((s) => s.id)).toEqual([a.id])
  })
  it('el cursor es el último, y otra página no repite', () => {
    expect(cursorDeSeguimientos([b, a])).toEqual({ antesEn: a.ocurridoEn, antesId: a.id })
    expect(cursorDeSeguimientos([])).toBeNull()
    expect(sumarPagina([c, b], [b, a]).map((s) => s.id)).toEqual([c.id, b.id, a.id])
  })
})

describe('validarSeguimiento', () => {
  const contexto = { ahora: '2026-10-15T15:00:00Z', zona: 'America/La_Paz', tiposActivos: [TIPO] }
  const valores = (cambios: Partial<ValoresDelSeguimiento> = {}): ValoresDelSeguimiento => ({
    tipoId: TIPO,
    titulo: '  Llamó  ',
    detalle: null,
    visible: false,
    ocurridoEn: '',
    recordatorio: '',
    vehiculo: '',
    ...cambios,
  })
  it('recorta el resumen y deja «ahora» en nulo', () => {
    expect(validarSeguimiento(valores(), contexto)).toEqual({
      ok: true,
      tipoId: TIPO,
      titulo: 'Llamó',
      detalle: null,
      visibilidad: 'privado',
      ocurridoEn: null,
      recordarEn: null,
      vehiculo: '',
    })
    expect(validarSeguimiento(valores({ visible: true }), contexto)).toMatchObject({
      visibilidad: 'publico',
    })
  })
  it('lo que no pasa, junto a su campo y con los motivos de la base', () => {
    expect(validarSeguimiento(valores({ titulo: ' ', tipoId: OTRO_TIPO }), contexto)).toEqual({
      ok: false,
      errores: {
        titulo: 'Escribe un resumen del seguimiento.',
        tipoId: 'Elige un tipo de seguimiento que esté activo.',
      },
    })
    expect(validarSeguimiento(valores({ titulo: 'x'.repeat(121) }), contexto)).toMatchObject({
      errores: { titulo: 'El resumen admite hasta 120 caracteres.' },
    })
    // 11:30 en La Paz son las 15:30 UTC: media hora en el futuro.
    expect(validarSeguimiento(valores({ ocurridoEn: '2026-10-15T11:30' }), contexto)).toMatchObject(
      {
        errores: { ocurridoEn: expect.stringContaining('no puede ser en el futuro') as unknown },
      },
    )
    expect(
      validarSeguimiento(
        valores({ detalle: { type: 'doc', content: [{ type: 'heading' }] } as never }),
        contexto,
      ),
    ).toMatchObject({ errores: { detalle: 'El detalle tiene un formato que no se admite.' } })
  })
  it('una fecha pasada se manda como instante; un tipo apagado que ya tenía se conserva', () => {
    expect(validarSeguimiento(valores({ ocurridoEn: '2026-10-14T09:00' }), contexto)).toMatchObject(
      {
        ok: true,
        ocurridoEn: '2026-10-14T13:00:00.000Z',
      },
    )
    expect(
      validarSeguimiento(valores({ tipoId: OTRO_TIPO }), contexto, uno({ tipoId: OTRO_TIPO })),
    ).toMatchObject({ ok: true })
  })
})

describe('el recordatorio que entra con el seguimiento', () => {
  const contexto = { ahora: '2026-10-15T15:00:00Z', zona: 'America/La_Paz', tiposActivos: [TIPO] }
  const base = {
    tipoId: TIPO,
    titulo: 'Llamó',
    detalle: null,
    visible: false,
    ocurridoEn: '',
    vehiculo: '',
  }
  it('a futuro viaja como instante; pasado se dice junto al campo; al editar no se ofrece', () => {
    expect(
      validarSeguimiento({ ...base, recordatorio: '2026-10-16T09:00' }, contexto),
    ).toMatchObject({
      ok: true,
      recordarEn: '2026-10-16T13:00:00.000Z',
    })
    expect(
      validarSeguimiento({ ...base, recordatorio: '2026-10-15T09:00' }, contexto),
    ).toMatchObject({
      errores: { recordatorio: 'El recordatorio tiene que ser en el futuro.' },
    })
    expect(
      validarSeguimiento({ ...base, recordatorio: '2026-10-15T09:00' }, contexto, uno()),
    ).toMatchObject({ ok: true, recordarEn: null })
  })
})

describe('cambiosDelSeguimiento', () => {
  const contexto = { ahora: '2026-10-15T15:00:00Z', zona: 'America/La_Paz', tiposActivos: [TIPO] }
  it('sólo lo que cambió; uno del alta sin tocar sigue siendo sólo texto', () => {
    const original = uno()
    const inicial = documentoInicial(original)
    const igual = validarSeguimiento(
      {
        tipoId: TIPO,
        titulo: 'Llamó',
        detalle: inicial,
        visible: false,
        ocurridoEn: '',
        recordatorio: '',
        vehiculo: '',
      },
      contexto,
      original,
    )
    if (!igual.ok) throw new Error('debía pasar')
    expect(cambiosDelSeguimiento(original, igual)).toEqual({})
    const otro = validarSeguimiento(
      {
        tipoId: TIPO,
        titulo: 'Llamó 2',
        detalle: null,
        visible: true,
        ocurridoEn: '',
        recordatorio: '',
        vehiculo: '',
      },
      contexto,
      original,
    )
    if (!otro.ok) throw new Error('debía pasar')
    expect(cambiosDelSeguimiento(original, otro)).toEqual({
      titulo: 'Llamó 2',
      detalle: null,
      visibilidad: 'publico',
    })
  })
  it('el detalle del alta arranca como párrafos', () => {
    expect(documentoInicial(uno({ detalleTexto: 'a\nb' }))).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'a' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'b' }] },
      ],
    })
    expect(documentoInicial(uno({ detalleTexto: null }))).toBeNull()
  })
})

describe('el vehículo de un seguimiento', () => {
  const contexto = { ahora: '2026-10-15T15:00:00Z', zona: 'America/La_Paz', tiposActivos: [TIPO] }
  const AUTO = { id: '33333333-3333-4333-8333-333333333333', titulo: 'Kia Rio', numero: 13 }
  // Lo mismo que tiene el original, salvo el vehículo elegido.
  const validoPara = (original: Seguimiento, vehiculo: string) => {
    const v = validarSeguimiento(
      {
        tipoId: original.tipoId,
        titulo: original.titulo,
        detalle: documentoInicial(original),
        visible: original.visibilidad === 'publico',
        ocurridoEn: '',
        recordatorio: '',
        vehiculo,
      },
      contexto,
      original,
    )
    if (!v.ok) {
      throw new Error('debía ser válido')
    }
    return v
  }
  it('lee el que la base nombra, o que había uno que ya no ve', () => {
    expect(
      seguimientoDesde({ ...CRUDO, vehiculo: AUTO, vehiculo_oculto: false })?.vehiculo,
    ).toEqual(AUTO)
    expect(seguimientoDesde({ ...CRUDO, vehiculo: null, vehiculo_oculto: true })).toMatchObject({
      vehiculo: null,
      vehiculoOculto: true,
    })
  })
  it('al editar sólo viaja si cambió; conservar el que ya no ve no es un cambio', () => {
    const conAuto = uno({ vehiculo: AUTO })
    expect(cambiosDelSeguimiento(conAuto, validoPara(conAuto, AUTO.id))).toEqual({})
    expect(cambiosDelSeguimiento(conAuto, validoPara(conAuto, ''))).toEqual({ vehiculoId: null })
    const oculto = uno({ vehiculo: null, vehiculoOculto: true })
    expect(cambiosDelSeguimiento(oculto, validoPara(oculto, 'oculto'))).toEqual({})
    expect(cambiosDelSeguimiento(oculto, validoPara(oculto, AUTO.id))).toEqual({
      vehiculoId: AUTO.id,
    })
  })
})
