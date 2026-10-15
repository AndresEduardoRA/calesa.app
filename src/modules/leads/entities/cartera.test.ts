import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  accionesDeCartera,
  avisoDeVehiculos,
  candidatosDesde,
  carteraDesde,
  duenoDe,
  filtrarCandidatos,
  respuestaDeCarteraDesde,
  sePuedeQuitarA,
  textoDeTransferencia,
  type PersonaDeCartera,
} from './cartera'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'

function persona(datos: Partial<PersonaDeCartera> & { usuarioId: string }): PersonaDeCartera {
  return {
    nombre: 'Persona',
    tipoAcceso: 'compartido',
    desde: '2026-10-15T10:00:00+00:00',
    compartidoPor: null,
    esYo: false,
    ...datos,
  }
}

const permiso = (clave: string, alcance: 'propios' | 'todos'): Permisos[number] => ({
  clave: clave as Permisos[number]['clave'],
  origenId: null,
  alcance,
})

const ASESOR: Permisos = [
  permiso('leads.compartir', 'propios'),
  permiso('leads.transferir', 'propios'),
]
const SUPERVISION: Permisos = [
  permiso('leads.compartir', 'todos'),
  permiso('leads.transferir', 'todos'),
]

describe('carteraDesde', () => {
  it('lee a quienes lo tienen, con su tipo y quién lo compartió', () => {
    const cartera = carteraDesde([
      { usuario_id: A, nombre: 'Rosa', tipo_acceso: 'dueno', desde: '2026-10-15', es_yo: true },
      {
        usuario_id: B,
        nombre: 'Juan',
        tipo_acceso: 'compartido',
        desde: '2026-10-15',
        compartido_por: 'Rosa',
        es_yo: false,
      },
    ])
    expect(cartera).toEqual([
      {
        usuarioId: A,
        nombre: 'Rosa',
        tipoAcceso: 'dueno',
        desde: '2026-10-15',
        compartidoPor: null,
        esYo: true,
      },
      {
        usuarioId: B,
        nombre: 'Juan',
        tipoAcceso: 'compartido',
        desde: '2026-10-15',
        compartidoPor: 'Rosa',
        esYo: false,
      },
    ])
  })
  it('un valor del enum que quedó sin uso se lee como dueño', () => {
    const cartera = carteraDesde([
      { usuario_id: A, nombre: 'Rosa', tipo_acceso: 'adoptado', desde: '2026-10-15', es_yo: false },
    ])
    expect(cartera?.[0]?.tipoAcceso).toBe('dueno')
  })
  it('una forma rota es null, no una cartera vacía', () => {
    expect(carteraDesde({})).toBeNull()
    expect(carteraDesde([{ usuario_id: 'no-es-un-id' }])).toBeNull()
  })
})

describe('respuestaDeCarteraDesde', () => {
  it('trae el resultado y la cartera nueva', () => {
    const r = respuestaDeCarteraDesde({
      resultado: 'compartido',
      cartera: [{ usuario_id: A, nombre: 'Rosa', tipo_acceso: 'dueno', desde: 'x', es_yo: true }],
    })
    expect(r?.resultado).toBe('compartido')
    expect(r?.cartera).toHaveLength(1)
  })
  it('al salir no hay cartera: ya no se ve', () => {
    expect(respuestaDeCarteraDesde({ resultado: 'salio' })).toEqual({
      resultado: 'salio',
      cartera: null,
    })
  })
  it('un resultado que no existe, o una cartera rota, no pasa', () => {
    expect(respuestaDeCarteraDesde({ resultado: 'otro' })).toBeNull()
    expect(respuestaDeCarteraDesde({ resultado: 'compartido', cartera: [{}] })).toBeNull()
  })
})

describe('accionesDeCartera', () => {
  const dueno = persona({ usuarioId: A, tipoAcceso: 'dueno', esYo: true })
  const compartido = persona({ usuarioId: B })
  const yoCompartido = persona({ usuarioId: C, esYo: true })

  it('el dueño con «propios» comparte, transfiere y quita; no sale', () => {
    expect(accionesDeCartera(ASESOR, [dueno, compartido])).toEqual({
      compartir: true,
      transferir: true,
      quitar: true,
      salir: false,
    })
  })
  it('un compartido con «propios» no mueve nada, y puede salir', () => {
    const cartera = [persona({ usuarioId: A, tipoAcceso: 'dueno' }), yoCompartido]
    expect(accionesDeCartera(ASESOR, cartera)).toEqual({
      compartir: false,
      transferir: false,
      quitar: false,
      salir: true,
    })
  })
  it('la supervisión con «todos» sin cartera mueve, y no sale (no lo tiene)', () => {
    const cartera = [persona({ usuarioId: A, tipoAcceso: 'dueno' }), compartido]
    expect(accionesDeCartera(SUPERVISION, cartera)).toEqual({
      compartir: true,
      transferir: true,
      quitar: true,
      salir: false,
    })
  })
  it('sin los permisos, nada', () => {
    expect(accionesDeCartera([], [dueno, compartido])).toEqual({
      compartir: false,
      transferir: false,
      quitar: false,
      salir: false,
    })
  })
  it('no se quita si no hay a quién: el dueño solo no tiene compartidos', () => {
    expect(accionesDeCartera(ASESOR, [dueno]).quitar).toBe(false)
  })
  it('un compartido que es la única otra persona no puede salir si está solo', () => {
    expect(accionesDeCartera(ASESOR, [yoCompartido]).salir).toBe(false)
  })
})

describe('sePuedeQuitarA', () => {
  const acciones = { compartir: true, transferir: true, quitar: true, salir: false }
  it('a un compartido ajeno sí; al dueño y a sí mismo no', () => {
    expect(sePuedeQuitarA(persona({ usuarioId: B }), acciones)).toBe(true)
    expect(sePuedeQuitarA(persona({ usuarioId: A, tipoAcceso: 'dueno' }), acciones)).toBe(false)
    expect(sePuedeQuitarA(persona({ usuarioId: C, esYo: true }), acciones)).toBe(false)
  })
  it('sin la acción, a nadie', () => {
    expect(sePuedeQuitarA(persona({ usuarioId: B }), { ...acciones, quitar: false })).toBe(false)
  })
})

describe('textoDeTransferencia', () => {
  it('nombra al entrante y dice que el saliente conserva el acceso', () => {
    const cartera = [persona({ usuarioId: A, tipoAcceso: 'dueno', nombre: 'Rosa Mamani' })]
    expect(textoDeTransferencia('Ana Rojas', cartera, 'Juan Pérez')).toBe(
      '«Ana Rojas» pasará a ser de Juan Pérez. Rosa Mamani seguirá con acceso compartido.',
    )
  })
  it('si el saliente es quien mira, le habla de tú', () => {
    const cartera = [persona({ usuarioId: A, tipoAcceso: 'dueno', esYo: true })]
    expect(textoDeTransferencia('Ana Rojas', cartera, 'Juan Pérez')).toBe(
      '«Ana Rojas» pasará a ser de Juan Pérez. Tú seguirás con acceso compartido.',
    )
  })
  it('sin dueño no inventa un saliente', () => {
    expect(textoDeTransferencia('Ana Rojas', [], 'Juan Pérez')).toBe(
      '«Ana Rojas» pasará a ser de Juan Pérez.',
    )
  })
})

describe('duenoDe y candidatos', () => {
  it('el dueño es el de tipo dueño', () => {
    const dueno = persona({ usuarioId: A, tipoAcceso: 'dueno' })
    expect(duenoDe([persona({ usuarioId: B }), dueno])).toBe(dueno)
    expect(duenoDe([persona({ usuarioId: B })])).toBeNull()
  })
  it('lee los candidatos y descarta una forma rota', () => {
    expect(candidatosDesde([{ id: A, nombre: 'Rosa' }])).toEqual([{ id: A, nombre: 'Rosa' }])
    expect(candidatosDesde([{ id: 'x' }])).toBeNull()
  })
  it('filtra sin tildes ni mayúsculas, y sin texto da todos', () => {
    const lista = [
      { id: A, nombre: 'María Pérez' },
      { id: B, nombre: 'Juan Soto' },
    ]
    expect(filtrarCandidatos(lista, 'maria').map((c) => c.id)).toEqual([A])
    expect(filtrarCandidatos(lista, '  ')).toHaveLength(2)
    expect(filtrarCandidatos(lista, 'zzz')).toEqual([])
  })
})

describe('avisoDeVehiculos', () => {
  it('sólo con vinculados que quien mira ve', () => {
    expect(avisoDeVehiculos(0)).toBeNull()
    expect(avisoDeVehiculos(1)).toBe(
      'Tiene un vehículo vinculado: quien lo reciba podrá verlo y, si su rol lo permite, editarlo.',
    )
    expect(avisoDeVehiculos(3)).toBe(
      'Tiene 3 vehículos vinculados: quien lo reciba podrá verlos y, si su rol lo permite, editarlos.',
    )
  })
})
