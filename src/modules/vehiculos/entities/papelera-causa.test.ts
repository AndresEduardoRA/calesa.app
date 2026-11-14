import { describe, expect, it } from 'vitest'
import { envioDesde, errorDeEnvio, type ResultadoDeEnvio } from './papelera'

const ID = (n: number) => `00000000-0000-0000-0000-00000000000${String(n)}`

const envio = (cambios: Partial<ResultadoDeEnvio>): ResultadoDeEnvio => ({
  lote: ID(9),
  actualizadoEn: '2026-10-13T12:00:00+00:00',
  enviados: [],
  rechazados: [],
  ...cambios,
})

describe('la causa del rechazo', () => {
  it('la causa del rechazo se lee; sin ella (o rota) queda nula', () => {
    const leer = (causa: Record<string, unknown>) =>
      envioDesde({
        lote: null,
        actualizado_en: null,
        enviados: [],
        rechazados: [{ id: ID(1), titulo: 'A', codigo: '23514', motivo: 'M.', ...causa }],
      }).rechazados[0]?.causa
    expect(leer({ causa: 'vinculado' })).toBe('vinculado')
    expect(leer({})).toBeNull()
    expect(leer({ causa: 7 })).toBeNull()
  })
})

describe('errorDeEnvio', () => {
  const rechazo = (codigo: string, causa: string | null = null, id = 1) => ({
    id: ID(id),
    titulo: 'A',
    codigo,
    motivo: 'Motivo.',
    causa,
  })

  it('uno solo que otra persona cambió es un conflicto; lo demás, una regla', () => {
    const uno = (codigo: string) => envio({ lote: null, rechazados: [rechazo(codigo)] })
    expect(errorDeEnvio(uno('PT409'))).toEqual({
      codigo: 'conflicto',
      mensaje: 'No se envió «A»: Motivo.',
    })
    expect(errorDeEnvio(uno('42501')).codigo).toBe('sin_permiso')
    expect(errorDeEnvio(uno('23514')).codigo).toBe('regla')
  })

  it('con uno solo y ninguno enviado lleva la causa del bloqueo', () => {
    const error = errorDeEnvio(envio({ lote: null, rechazados: [rechazo('23514', 'documentos')] }))
    expect(error).toEqual({
      codigo: 'regla',
      mensaje: 'No se envió «A»: Motivo.',
      causa: 'documentos',
    })
  })

  it('en un lote, o si entró alguno, no lleva causa: se listan los motivos', () => {
    const lote = envio({
      lote: null,
      rechazados: [rechazo('23514', 'documentos'), rechazo('23514', 'pagos', 2)],
    })
    expect(errorDeEnvio(lote)).not.toHaveProperty('causa')
    const parcial = envio({
      enviados: [{ id: ID(3), titulo: 'C', despublicado: false }],
      rechazados: [rechazo('23514', 'documentos')],
    })
    expect(errorDeEnvio(parcial)).not.toHaveProperty('causa')
  })

  it('un conflicto no lleva causa aunque la base mande una', () => {
    expect(
      errorDeEnvio(envio({ lote: null, rechazados: [rechazo('PT409', null)] })),
    ).not.toHaveProperty('causa')
  })
})
