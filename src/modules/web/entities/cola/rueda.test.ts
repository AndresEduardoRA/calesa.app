import { describe, expect, it } from 'vitest'
import { MOTIVO_CUENTA_BLOQUEADA, configuracionNueva, personasParaLaRueda } from './rueda'
import type { FilaDelTablero } from './tablero'

const ID = {
  activa: '00000000-0000-4000-8000-000000000001',
  invitada: '00000000-0000-4000-8000-000000000002',
  bloqueada: '00000000-0000-4000-8000-000000000003',
  baja: '00000000-0000-4000-8000-000000000004',
}

function persona(id: string, estado: string) {
  return { id, nombre: `Persona ${estado}`, email: `${estado}@ejemplo.com`, estado }
}

function fila(usuarioId: string, cambios: Partial<FilaDelTablero> = {}): FilaDelTablero {
  return {
    usuarioId,
    nombre: 'x',
    enLaRueda: true,
    cuentaActiva: true,
    faltaWhatsapp: false,
    disponible: true,
    prioridad: 0,
    orden: 0,
    maxAbiertas: null,
    cupo: 5,
    abiertas: 0,
    asignadasTotal: 0,
    contactadasTotal: 0,
    vencidasTotal: 0,
    tasaContactoPct: null,
    ultimaAsignacionEn: null,
    ...cambios,
  }
}

describe('personasParaLaRueda', () => {
  const personas = [
    persona(ID.activa, 'activa'),
    persona(ID.invitada, 'invitacion_pendiente'),
    persona(ID.bloqueada, 'bloqueada'),
    persona(ID.baja, 'baja'),
  ]

  it('deja fuera a la dada de baja y apaga a la bloqueada con su motivo', () => {
    const elegidas = personasParaLaRueda(personas, [])
    expect(elegidas.map((p) => p.id)).toEqual([ID.activa, ID.invitada, ID.bloqueada])
    const bloqueada = elegidas.find((p) => p.id === ID.bloqueada)
    expect(bloqueada).toMatchObject({ elegible: false, motivo: MOTIVO_CUENTA_BLOQUEADA })
  })

  it('deja elegir a la activa y a la de invitación pendiente', () => {
    const elegidas = personasParaLaRueda(personas, [])
    for (const id of [ID.activa, ID.invitada]) {
      expect(elegidas.find((p) => p.id === id)).toMatchObject({
        elegible: true,
        motivo: null,
        enLaRueda: null,
      })
    }
  })

  it('trae los valores de quien ya está habilitada (no los de fábrica)', () => {
    const elegidas = personasParaLaRueda(personas, [
      fila(ID.invitada, { maxAbiertas: 7, prioridad: 2, orden: 3 }),
    ])
    expect(elegidas.find((p) => p.id === ID.invitada)?.enLaRueda).toEqual({
      usuarioId: ID.invitada,
      maxAbiertas: 7,
      prioridad: 2,
      orden: 3,
    })
    expect(elegidas.find((p) => p.id === ID.activa)?.enLaRueda).toBeNull()
  })
})

describe('configuracionNueva', () => {
  it('hereda el cupo de la política, con prioridad y orden en 0', () => {
    expect(configuracionNueva(ID.activa)).toEqual({
      usuarioId: ID.activa,
      maxAbiertas: null,
      prioridad: 0,
      orden: 0,
    })
  })
})
