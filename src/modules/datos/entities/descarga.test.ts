import { describe, expect, it } from 'vitest'
import { estadoDeLaRespuesta, nombreDeLaDisposicion, pedidoDelFormulario } from './descarga'

const JSON_ = 'application/json'
const respuesta = (status: number, cuerpo: unknown, tipo = JSON_, redirigida = false) =>
  estadoDeLaRespuesta({ status, tipo, redirigida, cuerpo })

describe('estadoDeLaRespuesta', () => {
  it('un CSV es el archivo; un 200 que no es CSV es un error', () => {
    expect(respuesta(200, null, 'text/csv; charset=utf-8')).toEqual({ tipo: 'archivo' })
    expect(respuesta(200, null, 'text/html')).toEqual({ tipo: 'error', motivo: 'generico' })
  })

  it('el límite trae la hora en que se libera; sin ella es un error', () => {
    const libreEn = '2026-11-12T19:42:00Z'
    expect(respuesta(429, { codigo: 'limite', libreEn })).toEqual({ tipo: 'limite', libreEn })
    expect(respuesta(429, { codigo: 'limite' })).toEqual({ tipo: 'error', motivo: 'generico' })
  })

  it('el tope trae su número; sin él es un error', () => {
    expect(respuesta(409, { codigo: 'demasiadas', tope: 250000 })).toEqual({
      tipo: 'demasiadas',
      tope: 250000,
    })
    expect(respuesta(409, { codigo: 'demasiadas' })).toEqual({ tipo: 'error', motivo: 'generico' })
  })

  it('vacía y sin permiso', () => {
    expect(respuesta(404, { codigo: 'vacia', mensaje: 'x' })).toEqual({ tipo: 'vacia' })
    expect(respuesta(403, { codigo: 'sin_permiso' })).toEqual({ tipo: 'sin_permiso' })
  })

  it('la sesión vencida: un 401 nuestro, una redirección o una respuesta que no es JSON', () => {
    expect(respuesta(401, { codigo: 'sesion' })).toEqual({ tipo: 'error', motivo: 'sesion' })
    expect(respuesta(200, null, 'text/html', true)).toEqual({ tipo: 'error', motivo: 'sesion' })
    expect(respuesta(500, null, 'text/html')).toEqual({ tipo: 'error', motivo: 'sesion' })
  })

  it('400, 403 de origen, 500 y un cuerpo ilegible son el error genérico (el 500 con nuestro texto)', () => {
    expect(respuesta(400, { codigo: 'pedido' })).toEqual({ tipo: 'error', motivo: 'generico' })
    expect(respuesta(403, { codigo: 'origen' })).toEqual({ tipo: 'error', motivo: 'generico' })
    expect(respuesta(500, { codigo: 'error', mensaje: 'No pudimos leer.' })).toEqual({
      tipo: 'error',
      motivo: 'generico',
      mensaje: 'No pudimos leer.',
    })
    expect(respuesta(500, 'nada')).toEqual({ tipo: 'error', motivo: 'generico' })
  })
})

describe('nombreDeLaDisposicion', () => {
  it('lee el nombre del encabezado y si falta usa la entidad', () => {
    expect(
      nombreDeLaDisposicion('attachment; filename="leads-todos-2026-11-12.csv"', 'leads'),
    ).toBe('leads-todos-2026-11-12.csv')
    expect(nombreDeLaDisposicion(null, 'cotizaciones')).toBe('cotizaciones.csv')
  })
})

describe('pedidoDelFormulario', () => {
  const ORIGEN = '3f0c9a43-6a2e-4c43-9b1a-0b6d1c2e8f10'
  const vacio = { desde: '', hasta: '', origen: '' }

  it('sin fechas pide todo con «;»; en cotizaciones el origen vacío es todos', () => {
    expect(pedidoDelFormulario({ entidad: 'leads', ...vacio, origen: ORIGEN })).toEqual({
      ok: true,
      pedido: { entidad: 'leads', delimitador: ';' },
    })
    expect(pedidoDelFormulario({ entidad: 'cotizaciones', ...vacio })).toEqual({
      ok: true,
      pedido: { entidad: 'cotizaciones', delimitador: ';' },
    })
  })

  it('el rango al revés se dice en «Hasta»; vehículos sin origen, en «Origen»', () => {
    expect(
      pedidoDelFormulario({ entidad: 'leads', ...vacio, desde: '2026-02-01', hasta: '2026-01-01' }),
    ).toEqual({ ok: false, campo: 'hasta', mensaje: 'La fecha final es anterior a la inicial.' })
    expect(pedidoDelFormulario({ entidad: 'vehiculos', ...vacio })).toMatchObject({
      ok: false,
      campo: 'origen',
    })
    expect(pedidoDelFormulario({ entidad: 'vehiculos', ...vacio, origen: ORIGEN })).toEqual({
      ok: true,
      pedido: { entidad: 'vehiculos', delimitador: ';', origen: ORIGEN },
    })
  })
})
