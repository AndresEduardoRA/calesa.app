import { describe, expect, it } from 'vitest'
import {
  accionesSobre,
  descripcionDeBaja,
  estadoDePersona,
  filtrarPersonas,
  idDePersona,
  nombreDePersona,
  personasDesde,
  resultadoDeBaja,
  vistaPreviaDesde,
  type PersonaDelEquipo,
} from './persona'

const cuenta = { activo: true, bloqueado: false, invitadoEn: null, invitacionAceptadaEn: null }

describe('estadoDePersona', () => {
  it('activa si no pasa nada', () => {
    expect(estadoDePersona(cuenta)).toBe('activa')
  })

  it('invitación pendiente hasta que elige su contraseña', () => {
    const invitada = { ...cuenta, invitadoEn: '2026-10-11T15:00:00+00:00' }
    expect(estadoDePersona(invitada)).toBe('invitacion_pendiente')
    expect(
      estadoDePersona({ ...invitada, invitacionAceptadaEn: '2026-10-11T16:00:00+00:00' }),
    ).toBe('activa')
  })

  it('bloqueada le gana a pendiente, y baja le gana a todo', () => {
    const invitada = { ...cuenta, invitadoEn: '2026-10-11T15:00:00+00:00' }
    expect(estadoDePersona({ ...invitada, bloqueado: true })).toBe('bloqueada')
    expect(estadoDePersona({ ...invitada, bloqueado: true, activo: false })).toBe('baja')
  })
})

const fila = {
  id: '00000000-0000-0000-0000-000000000002',
  nombre: 'Sofía Ramos',
  email: 'sofia@ejemplo.com',
  avatar_ruta: null,
  activo: true,
  bloqueado: false,
  bloqueo_motivo: null,
  invitado_en: null,
  invitacion_aceptada_en: null,
  usuarios_roles: [
    {
      es_principal: false,
      roles: {
        id: '00000000-0000-0000-0000-0000000000bb',
        clave: 'logistica',
        nombre: 'Logística',
        color: null,
        orden: 20,
      },
    },
    {
      es_principal: true,
      roles: {
        id: '00000000-0000-0000-0000-0000000000aa',
        clave: 'asesor',
        nombre: 'Asesor',
        color: '#027a48',
        orden: 30,
      },
    },
  ],
}

describe('personasDesde', () => {
  it('da forma a la persona y pone primero su rol principal', () => {
    expect(personasDesde([fila])).toEqual([
      {
        id: fila.id,
        nombre: 'Sofía Ramos',
        email: 'sofia@ejemplo.com',
        avatarRuta: null,
        estado: 'activa',
        bloqueoMotivo: null,
        roles: [
          {
            id: '00000000-0000-0000-0000-0000000000aa',
            clave: 'asesor',
            nombre: 'Asesor',
            color: '#027a48',
            esPrincipal: true,
          },
          {
            id: '00000000-0000-0000-0000-0000000000bb',
            clave: 'logistica',
            nombre: 'Logística',
            color: null,
            esPrincipal: false,
          },
        ],
      },
    ])
  })

  it('una persona sin roles ni correo no rompe la lista', () => {
    const [persona] = personasDesde([{ ...fila, email: null, usuarios_roles: [] }])
    expect(persona?.roles).toEqual([])
    expect(persona?.email).toBe('')
  })
})

describe('nombreDePersona', () => {
  it('su nombre o, si no lo cargó, su correo', () => {
    expect(nombreDePersona({ nombre: 'Sofía Ramos', email: 's@ejemplo.com' })).toBe('Sofía Ramos')
    expect(nombreDePersona({ nombre: ' ', email: 's@ejemplo.com' })).toBe('s@ejemplo.com')
    expect(nombreDePersona({ nombre: '', email: '' })).toBe('Sin nombre')
  })
})

describe('filtrarPersonas', () => {
  const persona = (nombre: string, estado: PersonaDelEquipo['estado']): PersonaDelEquipo => ({
    id: nombre,
    nombre,
    email: `${nombre.toLowerCase()}@ejemplo.com`,
    avatarRuta: null,
    estado,
    bloqueoMotivo: null,
    roles: [],
  })
  const equipo = [
    persona('Sofía', 'activa'),
    persona('Rosa', 'bloqueada'),
    persona('Diego', 'baja'),
    persona('Ana', 'invitacion_pendiente'),
  ]
  const nombres = (estado: Parameters<typeof filtrarPersonas>[1]['estado'], texto = '') =>
    filtrarPersonas(equipo, { estado, texto }).map((p) => p.nombre)

  it('«en el equipo» deja afuera sólo a las dadas de baja', () => {
    expect(nombres('vigentes')).toEqual(['Sofía', 'Rosa', 'Ana'])
  })

  it('filtra por un estado', () => {
    expect(nombres('baja')).toEqual(['Diego'])
    expect(nombres('invitacion_pendiente')).toEqual(['Ana'])
  })

  it('busca por nombre o correo sin importar acentos ni mayúsculas', () => {
    expect(nombres('vigentes', 'sofia')).toEqual(['Sofía'])
    expect(nombres('vigentes', 'ROSA@')).toEqual(['Rosa'])
    expect(nombres('vigentes', 'nadie')).toEqual([])
  })
})

describe('vistaPreviaDesde', () => {
  it('da forma a los conteos de la RPC', () => {
    expect(vistaPreviaDesde({ leads_al_limbo: 12, oportunidades_abiertas: 3 })).toEqual({
      leadsAlLimbo: 12,
      oportunidadesAbiertas: 3,
    })
  })

  it('una forma inesperada es un error', () => {
    expect(() => vistaPreviaDesde({ leads_al_limbo: -1, oportunidades_abiertas: 0 })).toThrow()
  })
})

describe('descripcionDeBaja', () => {
  it('dice cuántos leads van al limbo y qué pasa con las oportunidades', () => {
    expect(descripcionDeBaja({ leadsAlLimbo: 12, oportunidadesAbiertas: 3 })).toBe(
      '12 leads irán al limbo: quedan sin dueño y nadie los ve hasta que alguien registre su teléfono. Sus 3 oportunidades abiertas se cancelan. Deja de poder ingresar. No se puede deshacer.',
    )
  })

  it('en singular y sin oportunidades', () => {
    expect(descripcionDeBaja({ leadsAlLimbo: 1, oportunidadesAbiertas: 0 })).toBe(
      '1 lead irá al limbo: queda sin dueño y nadie lo ve hasta que alguien registre su teléfono. Deja de poder ingresar. No se puede deshacer.',
    )
  })

  it('sin leads lo dice', () => {
    expect(descripcionDeBaja({ leadsAlLimbo: 0, oportunidadesAbiertas: 1 })).toBe(
      'No tiene leads a su cargo. Su oportunidad abierta se cancela. Deja de poder ingresar. No se puede deshacer.',
    )
  })
})

describe('idDePersona', () => {
  it('acepta un uuid y descarta cualquier otra cosa', () => {
    expect(idDePersona('00000000-0000-0000-0000-000000000002')).toBe(
      '00000000-0000-0000-0000-000000000002',
    )
    expect(idDePersona('sofia')).toBeNull()
    expect(idDePersona(undefined)).toBeNull()
    expect(idDePersona(null)).toBeNull()
  })
})

describe('accionesSobre', () => {
  const YO = 'yo'

  it('sobre una persona activa: roles, bloquear y dar de baja', () => {
    expect(accionesSobre({ id: 'otra', estado: 'activa' }, YO)).toEqual({
      roles: true,
      bloqueo: 'bloquear',
      baja: true,
      enlace: false,
      esPropia: false,
    })
  })

  it('a una bloqueada se la desbloquea; a una pendiente se le puede generar otro enlace', () => {
    expect(accionesSobre({ id: 'otra', estado: 'bloqueada' }, YO).bloqueo).toBe('desbloquear')
    expect(accionesSobre({ id: 'otra', estado: 'invitacion_pendiente' }, YO).enlace).toBe(true)
  })

  it('sobre la cuenta propia no se bloquea ni se da de baja', () => {
    expect(accionesSobre({ id: YO, estado: 'activa' }, YO)).toEqual({
      roles: true,
      bloqueo: null,
      baja: false,
      enlace: false,
      esPropia: true,
    })
  })

  it('sobre una dada de baja no queda nada por hacer', () => {
    expect(accionesSobre({ id: 'otra', estado: 'baja' }, YO)).toEqual({
      roles: false,
      bloqueo: null,
      baja: false,
      enlace: false,
      esPropia: false,
    })
  })
})

describe('resultadoDeBaja', () => {
  it('dice cuántos leads quedaron en el limbo', () => {
    expect(resultadoDeBaja('Sofía Ramos', 0)).toBe('Sofía Ramos ya no forma parte del equipo.')
    expect(resultadoDeBaja('Sofía Ramos', 1)).toBe(
      'Sofía Ramos ya no forma parte del equipo. 1 lead quedó en el limbo.',
    )
    expect(resultadoDeBaja('Sofía Ramos', 12)).toBe(
      'Sofía Ramos ya no forma parte del equipo. 12 leads quedaron en el limbo.',
    )
  })
})
