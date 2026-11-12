import { describe, expect, it } from 'vitest'
import {
  descripcionDeBaja,
  estadoDePersona,
  idDePersona,
  nombreDePersona,
  personasDesde,
  resultadoDeBaja,
  bajaHechaDesde,
  vistaPreviaDesde,
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
    expect(personasDesde([fila], new Set([fila.id]))).toEqual([
      {
        id: fila.id,
        nombre: 'Sofía Ramos',
        email: 'sofia@ejemplo.com',
        avatarRuta: null,
        avatarMiniaturaRuta: null,
        estado: 'activa',
        bloqueoMotivo: null,
        bajaEnCurso: false,
        dominada: true,
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

  it('una baja en curso: dada de baja y con su fila de equipo_bajas sin terminar', () => {
    const baja = { ...fila, activo: false }
    expect(
      personasDesde([{ ...baja, equipo_bajas: { terminada_en: null } }], null)[0]?.bajaEnCurso,
    ).toBe(true)
    expect(
      personasDesde([{ ...baja, equipo_bajas: { terminada_en: '2026-10-17T12:00:00Z' } }], null)[0]
        ?.bajaEnCurso,
    ).toBe(false)
    // Sin la fila (una baja anterior al cierre 1) o sin `equipo.usuarios.ver`: no se dice nada.
    expect(personasDesde([{ ...baja, equipo_bajas: null }], null)[0]?.bajaEnCurso).toBe(false)
    expect(personasDesde([fila], null)[0]?.bajaEnCurso).toBe(false)
  })

  it('una persona sin roles ni correo no rompe la lista', () => {
    const [persona] = personasDesde([{ ...fila, email: null, usuarios_roles: [] }], null)
    expect(persona?.roles).toEqual([])
    expect(persona?.email).toBe('')
  })

  it('dominada: si quien mira la domina, según personas_dominadas(); null si no se pudo saber', () => {
    expect(personasDesde([fila], new Set([fila.id]))[0]?.dominada).toBe(true)
    expect(personasDesde([fila], new Set())[0]?.dominada).toBe(false)
    expect(personasDesde([fila], null)[0]?.dominada).toBeNull()
  })
})

describe('nombreDePersona', () => {
  it('su nombre o, si no lo cargó, su correo', () => {
    expect(nombreDePersona({ nombre: 'Sofía Ramos', email: 's@ejemplo.com' })).toBe('Sofía Ramos')
    expect(nombreDePersona({ nombre: ' ', email: 's@ejemplo.com' })).toBe('s@ejemplo.com')
    expect(nombreDePersona({ nombre: '', email: '' })).toBe('Sin nombre')
  })
})

describe('vistaPreviaDesde', () => {
  it('da forma a los conteos de la RPC', () => {
    expect(vistaPreviaDesde({ leads_al_limbo: 12, oportunidades_abiertas: 3 })).toEqual({
      leadsAlLimbo: { n: 12, hayMas: false },
      oportunidadesAbiertas: { n: 3, hayMas: false },
    })
  })

  it('la base cuenta hasta 1.001: más que eso es «más de 1.000»', () => {
    expect(vistaPreviaDesde({ leads_al_limbo: 1001, oportunidades_abiertas: 1000 })).toEqual({
      leadsAlLimbo: { n: 1000, hayMas: true },
      oportunidadesAbiertas: { n: 1000, hayMas: false },
    })
  })

  it('una forma inesperada es un error', () => {
    expect(() => vistaPreviaDesde({ leads_al_limbo: -1, oportunidades_abiertas: 0 })).toThrow()
  })
})

describe('descripcionDeBaja', () => {
  it('dice cuántos leads van al limbo y qué pasa con las oportunidades', () => {
    expect(
      descripcionDeBaja({
        leadsAlLimbo: { n: 12, hayMas: false },
        oportunidadesAbiertas: { n: 3, hayMas: false },
      }),
    ).toBe(
      '12 leads irán al limbo: quedan sin dueño y nadie los ve hasta que alguien registre su teléfono. Sus 3 oportunidades abiertas se cancelan. Deja de poder ingresar. No se puede deshacer.',
    )
  })

  it('en singular y sin oportunidades', () => {
    expect(
      descripcionDeBaja({
        leadsAlLimbo: { n: 1, hayMas: false },
        oportunidadesAbiertas: { n: 0, hayMas: false },
      }),
    ).toBe(
      '1 lead irá al limbo: queda sin dueño y nadie lo ve hasta que alguien registre su teléfono. Deja de poder ingresar. No se puede deshacer.',
    )
  })

  it('con más del tope dice «más de 1.000», nunca un total', () => {
    expect(
      descripcionDeBaja({
        leadsAlLimbo: { n: 1000, hayMas: true },
        oportunidadesAbiertas: { n: 1000, hayMas: true },
      }),
    ).toBe(
      'más de 1.000 leads irán al limbo: quedan sin dueño y nadie los ve hasta que alguien registre su teléfono. Sus más de 1.000 oportunidades abiertas se cancelan. Deja de poder ingresar. No se puede deshacer.',
    )
  })

  it('sin leads lo dice', () => {
    expect(
      descripcionDeBaja({
        leadsAlLimbo: { n: 0, hayMas: false },
        oportunidadesAbiertas: { n: 1, hayMas: false },
      }),
    ).toBe(
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

describe('resultadoDeBaja', () => {
  it('dice cuántos leads quedaron en el limbo', () => {
    const hecha = (leadsAlLimbo: number) => ({ terminada: true, leadsAlLimbo })
    expect(resultadoDeBaja('Sofía Ramos', hecha(0))).toBe(
      'Sofía Ramos ya no forma parte del equipo.',
    )
    expect(resultadoDeBaja('Sofía Ramos', hecha(1))).toBe(
      'Sofía Ramos ya no forma parte del equipo. 1 lead quedó en el limbo.',
    )
    expect(resultadoDeBaja('Sofía Ramos', hecha(12))).toBe(
      'Sofía Ramos ya no forma parte del equipo. 12 leads quedaron en el limbo.',
    )
  })

  it('una baja que sigue por lotes dice que termina en unos minutos y que ya están en el limbo', () => {
    expect(resultadoDeBaja('Sofía Ramos', { terminada: false, leadsAlLimbo: 4901 })).toBe(
      'Sofía Ramos ya no forma parte del equipo. Tenía muchos leads: terminamos de pasarlos en unos minutos. Mientras tanto, los que quedan sin nadie ya están en el limbo y nadie más los ve como suyos.',
    )
  })
})

describe('bajaHechaDesde', () => {
  it('lee lo que devuelve equipo_dar_de_baja', () => {
    expect(bajaHechaDesde({ terminada: false, leads_al_limbo: 4901 })).toEqual({
      terminada: false,
      leadsAlLimbo: 4901,
    })
  })

  it('una forma rota es null', () => {
    expect(bajaHechaDesde(12)).toBeNull()
    expect(bajaHechaDesde({ terminada: 'si', leads_al_limbo: 1 })).toBeNull()
  })
})
