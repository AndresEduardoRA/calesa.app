import { describe, expect, it } from 'vitest'
import { normalizarTelefono } from '@/modules/leads/entities/telefono'
import {
  CANTIDAD_DE_LEADS,
  CODIGO_DE_PAIS,
  atributosQueCaben,
  correoDeDemo,
  idDeDemo,
  leadsDeDemo,
  pedidoDeLead,
  requeridosSinValor,
  telefonoDeDemo,
} from './datos-de-demo.mjs'
import { OBLIGATORIAS, leerVariables, textoDelResumen } from './sembrar.mjs'
import { editablesDeLaHoja } from './siembra-de-datos.mjs'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const AHORA = new Date('2026-10-28T15:00:00Z')

const completas = Object.fromEntries(OBLIGATORIAS.map((nombre) => [nombre, `valor-${nombre}`]))
const variables = (cambios: Record<string, string | undefined>) => ({
  ...completas,
  SEMBRAR_URL: 'http://127.0.0.1:54621/',
  DUENO_EMAIL: ' Duena@Local.Invalid ',
  ...cambios,
})

describe('sembrar: las variables', () => {
  it('nombra cada variable que falta, sin mostrar ningún valor', () => {
    const r = leerVariables({
      SEMBRAR_URL: 'http://127.0.0.1:54621',
      DUENO_CLAVE: 'secreto-que-no-sale',
    })
    expect(r.ok).toBe(false)
    const motivo = r.ok ? '' : r.motivo
    for (const nombre of [
      'SEMBRAR_CLAVE_PUBLICA',
      'SEMBRAR_CLAVE_SECRETA',
      'DUENO_EMAIL',
      'CLAVE_USUARIOS',
    ]) {
      expect(motivo).toContain(nombre)
    }
    expect(motivo).not.toContain('SEMBRAR_URL,')
    expect(motivo).not.toContain('secreto-que-no-sale')
  })

  it('una variable en blanco cuenta como faltante', () => {
    const r = leerVariables(variables({ CLAVE_USUARIOS: '   ' }))
    expect(r.ok ? '' : r.motivo).toContain('CLAVE_USUARIOS')
  })

  it('normaliza la URL y el correo, y las opcionales tienen su valor por defecto', () => {
    const r = leerVariables(variables({}))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.valores.url).toBe('http://127.0.0.1:54621')
    expect(r.valores.duenoEmail).toBe('duena@local.invalid')
    expect(r.valores.duenoNombre).toBe('Dueño de la demo')
    expect(r.valores.urlApp).toBeNull()
    expect(r.valores.apibara).toBeNull()
  })

  it('rechaza una URL con ruta, un correo sin forma y una clave de apibara corta, sin mostrar su valor', () => {
    expect(leerVariables(variables({ SEMBRAR_URL: 'https://x.supabase.co/rest/v1' })).ok).toBe(
      false,
    )
    expect(leerVariables(variables({ DUENO_EMAIL: 'no-es-correo' })).ok).toBe(false)
    const corta = leerVariables(variables({ APIBARA_CLAVE: 'corta' }))
    expect(corta.ok ? '' : corta.motivo).toContain('APIBARA_CLAVE')
    expect(corta.ok ? '' : corta.motivo).not.toContain('corta')
    const buena = leerVariables(variables({ APIBARA_CLAVE: ' relleno-local-123 ' }))
    expect(buena.ok && buena.valores.apibara).toBe('relleno-local-123')
  })
})

describe('sembrar: los ids y los correos de la demo', () => {
  it('cada cosa sembrada tiene un uuid fijo y distinto', () => {
    expect(idDeDemo('lead', 1)).toBe(idDeDemo('lead', 1))
    expect(idDeDemo('lead', 1)).toMatch(UUID)
    const ids = ['lead', 'vehiculo', 'cotizacion', 'seguimiento'].flatMap((t) =>
      Array.from({ length: 40 }, (_, i) => idDeDemo(t, i + 1)),
    )
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('el correo de una persona de demo es la clave de su rol en el dominio reservado .invalid', () => {
    expect(correoDeDemo('asesor')).toBe('asesor@demo.invalid')
    expect(correoDeDemo('Logística Norte')).toBe('logistica-norte@demo.invalid')
    expect(correoDeDemo('***')).toBe('persona@demo.invalid')
  })
})

describe('sembrar: los leads', () => {
  const leads = leadsDeDemo()

  it('son 30, con nombres y teléfonos que no se repiten', () => {
    expect(leads).toHaveLength(CANTIDAD_DE_LEADS)
    expect(new Set(leads.map((l) => l.nombre)).size).toBe(leads.length)
    expect(new Set(leads.map((l) => l.telefono)).size).toBe(leads.length)
    for (const l of leads) {
      const [, paterno, materno] = l.nombre.split(' ')
      expect(paterno).not.toBe(materno)
    }
  })

  it('cada teléfono pasa normalizar_telefono() y cae en la serie de ficción 591 7000 9NNN', () => {
    for (const l of leads) {
      const normalizado = normalizarTelefono(CODIGO_DE_PAIS, l.telefono)
      expect(normalizado).toEqual({
        ok: true,
        numero: expect.stringMatching(/^591700090\d{2}$/),
        internacional: false,
      })
    }
    expect(() => telefonoDeDemo(1000)).toThrow(RangeError)
  })

  it('hay prospectos y clientes, seguimientos, segundos seguimientos y recordatorios', () => {
    expect(leads.some((l) => l.esCliente)).toBe(true)
    expect(leads.some((l) => !l.esCliente)).toBe(true)
    expect(leads.filter((l) => l.seguimiento).length).toBeGreaterThan(20)
    expect(leads.some((l) => l.segundoSeguimiento)).toBe(true)
    expect(leads.some((l) => l.recordatorio)).toBe(true)
  })
})

describe('sembrar: el pedido de cada lead', () => {
  const leads = leadsDeDemo()
  const catalogos = {
    tipos: [
      { id: 't-prospecto', clase: 'prospecto' },
      { id: 't-cliente', clase: 'cliente' },
    ],
    origenes: [{ id: 'o-1' }, { id: 'o-2' }],
    tiposDeSeguimiento: [{ id: 's-1' }],
    campos: [
      { clave: 'ciudad', tipo: 'texto', opciones: [], activo: true, requerido: false },
      {
        clave: 'genero',
        tipo: 'opcion',
        opciones: [{ clave: 'femenino' }],
        activo: true,
        requerido: false,
      },
      { clave: 'edad', tipo: 'numero', opciones: [], activo: false, requerido: false },
    ],
    ahora: AHORA,
  }

  it('el pedido a crear_lead() sólo lleva las claves que acepta y fechas del lado correcto de ahora', () => {
    for (const l of leads) {
      const p = pedidoDeLead(l, catalogos)
      expect(p.p_id).toBe(l.id)
      expect(
        Object.keys(p.p_lead).every((k) =>
          [
            'nombre',
            'telefono_cc',
            'telefono_principal',
            'tipo_lead_id',
            'origen_lead_id',
            'atributos',
          ].includes(k),
        ),
      ).toBe(true)
      expect(p.p_lead.nombre.length).toBeLessThanOrEqual(120)
      expect(p.p_lead.tipo_lead_id).toBe(l.esCliente ? 't-cliente' : 't-prospecto')
      expect(p.p_lead.origen_lead_id).toBe(l.n % 2 ? 'o-1' : 'o-2')
      if (p.p_seguimiento) {
        expect(Object.keys(p.p_seguimiento).sort()).toEqual(['ocurrido_en', 'tipo_id', 'titulo'])
        expect(p.p_seguimiento.titulo.length).toBeLessThanOrEqual(120)
        expect(new Date(p.p_seguimiento.ocurrido_en).getTime()).toBeLessThan(AHORA.getTime())
      }
      if (p.p_recordatorio) {
        expect(new Date(p.p_recordatorio.recordar_en).getTime()).toBeGreaterThan(AHORA.getTime())
      }
    }
  })

  it('los atributos sólo llevan campos activos del layout, con un valor de su tipo', () => {
    const p = pedidoDeLead(leads[0]!, catalogos)
    expect(p.p_lead.atributos).toEqual({ ciudad: 'Santa Cruz', genero: 'femenino' })
    const varon = pedidoDeLead(leads[1]!, catalogos)
    expect(varon.p_lead.atributos).not.toHaveProperty('genero')
  })
})

describe('sembrar: atributos y requeridos', () => {
  const campos = [
    { clave: 'a', tipo: 'texto', opciones: [], activo: true, requerido: true },
    { clave: 'b', tipo: 'numero', opciones: [], activo: true, requerido: false },
    { clave: 'c', tipo: 'booleano', opciones: [], activo: true, requerido: true },
    { clave: 'd', tipo: 'opcion', opciones: [], activo: true, requerido: false },
    { clave: 'e', tipo: 'texto', opciones: [], activo: false, requerido: true },
  ]

  it('omite lo que no es del layout, lo apagado, el tipo equivocado y una opción que no existe', () => {
    const r = atributosQueCaben({ a: 'sí', b: 'diez', c: true, d: 'x', e: 'apagado', z: 1 }, campos)
    expect(r.atributos).toEqual({ a: 'sí', c: true })
    expect(r.omitidos.sort()).toEqual(['b', 'd', 'e', 'z'])
  })

  it('dice qué requerido activo queda sin valor', () => {
    expect(requeridosSinValor(campos, ['a'])).toEqual(['c'])
    expect(requeridosSinValor(campos, ['a', 'c'])).toEqual([])
  })
})

describe('sembrar: la hoja y el resumen', () => {
  it('los editables son los inputs con editable: true, en celdas o anidados', () => {
    const hoja = {
      secciones: [
        {
          items: [
            { nodo: 'remate', tipo: 'celda', tipo_nodo: 'input', editable: true },
            {
              nodo: 'fees',
              tipo: 'celda',
              tipo_nodo: 'calculo',
              editable: true,
              secundario: { nodo: 'fees_pct', tipo_nodo: 'constante', editable: true },
            },
            { nodo: 'oculto', tipo: 'celda', tipo_nodo: 'input', editable: false },
            {
              nodo: 'par',
              tipo: 'celda',
              tipo_nodo: 'calculo',
              editable: false,
              secundario: { nodo: 'pct_tipeado', tipo_nodo: 'input', editable: true },
            },
          ],
        },
      ],
    }
    expect([...editablesDeLaHoja(hoja)].sort()).toEqual(['pct_tipeado', 'remate'])
    expect(editablesDeLaHoja({}).size).toBe(0)
  })

  it('el resumen nombra los correos y por dónde entrar, nunca una clave ni un token', () => {
    const nada = { creados: 0, yaEstaban: 0, omitidos: [] }
    const texto = textoDelResumen({
      dueno: { email: 'duena@local.invalid', nuevo: true },
      personas: [
        {
          email: 'asesor@demo.invalid',
          rol: 'Asesor',
          nueva: true,
          cliente: { token: 'token-secreto' },
        },
      ],
      registro: 'ya estaba cerrado',
      apibara: 'clave de apibara: guardada',
      datos: {
        salteado: null,
        leads: { creados: 30, yaEstaban: 0, omitidos: [] },
        seguimientos: 29,
        recordatorios: 4,
        vehiculos: nada,
        cotizaciones: {
          creados: 0,
          yaEstaban: 0,
          omitidos: [{ que: 'X / Y', motivo: 'sin fórmula' }],
        },
        avisos: [],
        fallos: [],
      },
      entrada: 'http://localhost:3000',
    })
    expect(texto).toContain('asesor@demo.invalid — Asesor')
    expect(texto).toContain('leads: 30 nuevos')
    expect(texto).toContain('cotización sin sembrar, X / Y: sin fórmula')
    expect(texto).toContain('clave de apibara: guardada')
    expect(texto).toContain('Entra en http://localhost:3000 con duena@local.invalid.')
    expect(texto).not.toContain('token-secreto')
  })
})
