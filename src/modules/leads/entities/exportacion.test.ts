import { describe, expect, it } from 'vitest'
import { lineaDeCsv } from '@/shared/lib/csv/escribir'
import { camposDeLeadDesde, type CampoDeLead } from './campo'
import {
  camposDeExportacion,
  consultaDelListado,
  encabezadosDeExportacion,
  filaDeExportacion,
  nombreDeArchivoDeExportacion,
  nombresDeFiltros,
  registroDeExportacionDesde,
  telefonoDeExportacion,
  valorDeExportacion,
  type ContextoDeExportacion,
} from './exportacion'
import type { FilaDeLead } from './listado'

function campo(n: number, extra: Record<string, unknown> = {}): CampoDeLead {
  return camposDeLeadDesde([
    {
      id: `00000000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`,
      clave: `campo_${String(n)}`,
      etiqueta: `Campo ${String(n)}`,
      tipo: 'texto',
      opciones: [],
      requerido: false,
      valor_defecto: null,
      valor_defecto_empresa: null,
      grupo: null,
      orden: n * 10,
      en_tabla: false,
      filtrable: false,
      solo_cartera: false,
      es_sistema: false,
      activo: true,
      actualizado_en: '2026-10-14T20:00:00+00:00',
      ...extra,
    },
  ])[0] as CampoDeLead
}

const CONTEXTO: ContextoDeExportacion = {
  origenes: new Map([
    ['o1', 'Web'],
    ['o2', 'Referido'],
  ]),
  codigoDePais: '+591',
  zona: 'America/La_Paz',
}

function fila(extra: Partial<FilaDeLead> = {}): FilaDeLead {
  return {
    id: 'l1',
    numero: 1,
    nombre: 'Ana Pérez',
    telefono: '59170011002',
    enCartera: true,
    duenoId: 'u1',
    tipo: 'prospecto',
    origenId: 'o1',
    creadoEn: '2026-10-14T20:00:00+00:00',
    atributos: {},
    marcas: { esFavorito: false, estaTachado: false, etiquetas: [] },
    ...extra,
  }
}

describe('telefonoDeExportacion', () => {
  it('el de la empresa sale nacional, sin «+»', () => {
    expect(telefonoDeExportacion('59170011002', '+591')).toBe('70011002')
  })

  it('el de otro país sale con «+»', () => {
    expect(telefonoDeExportacion('5491122334455', '+591')).toBe('+5491122334455')
  })

  it('sin código de empresa sale con «+»', () => {
    expect(telefonoDeExportacion('59170011002', null)).toBe('+59170011002')
  })

  it('un nacional que empezaría con 0 sale internacional (el 0 se tomaría por el troncal)', () => {
    expect(telefonoDeExportacion('5910123456789', '+591')).toBe('+5910123456789')
  })

  it('un teléfono vacío sale vacío', () => {
    expect(telefonoDeExportacion('', '+591')).toBe('')
  })
})

describe('columnas', () => {
  it('Nombre, Teléfono, Tipo y Origen, y después los activos con su etiqueta y en su orden', () => {
    const campos = [campo(1), campo(2, { activo: false }), campo(3, { etiqueta: 'Ciudad' })]
    expect(encabezadosDeExportacion(campos)).toEqual([
      'Nombre',
      'Teléfono',
      'Tipo',
      'Origen',
      'Campo 1',
      'Ciudad',
    ])
    expect(camposDeExportacion(campos).map((c) => c.clave)).toEqual(['campo_1', 'campo_3'])
  })

  it('un privado de la cartera sale; uno apagado no', () => {
    const campos = [
      campo(1, { solo_cartera: true }),
      campo(2, { solo_cartera: true, activo: false }),
    ]
    expect(camposDeExportacion(campos).map((c) => c.clave)).toEqual(['campo_1'])
  })
})

describe('valorDeExportacion', () => {
  const zona = 'America/La_Paz'
  const opciones = [
    { clave: 'sedan', etiqueta: 'Sedán' },
    { clave: 'suv', etiqueta: 'SUV' },
  ]

  it('una opción sale con su texto de hoy; la que ya no existe, con su clave', () => {
    const c = campo(1, { tipo: 'opcion', opciones })
    expect(valorDeExportacion(c, 'sedan', zona)).toBe('Sedán')
    expect(valorDeExportacion(c, 'camion', zona)).toBe('camion')
  })

  it('varias opciones, unidas por « | »', () => {
    const c = campo(1, { tipo: 'multi_opcion', opciones })
    expect(valorDeExportacion(c, ['sedan', 'suv', 'viejo'], zona)).toBe('Sedán | SUV | viejo')
  })

  it('sí y no', () => {
    const c = campo(1, { tipo: 'booleano' })
    expect(valorDeExportacion(c, true, zona)).toBe('Sí')
    expect(valorDeExportacion(c, false, zona)).toBe('No')
  })

  it('una fecha en ISO y una fecha con hora en la zona de la empresa', () => {
    expect(valorDeExportacion(campo(1, { tipo: 'fecha' }), '2026-03-04', zona)).toBe('2026-03-04')
    expect(
      valorDeExportacion(campo(1, { tipo: 'fecha_hora' }), '2026-03-04T03:30:00+00:00', zona),
    ).toBe('2026-03-03T23:30')
  })

  it('un número sale como número (un negativo no es una fórmula)', () => {
    expect(valorDeExportacion(campo(1, { tipo: 'numero' }), -5, zona)).toBe(-5)
    expect(valorDeExportacion(campo(1, { tipo: 'moneda' }), 1200.5, zona)).toBe(1200.5)
  })

  it('sin dato, vacío', () => {
    expect(valorDeExportacion(campo(1), undefined, zona)).toBe('')
    expect(valorDeExportacion(campo(1), null, zona)).toBe('')
    expect(valorDeExportacion(campo(1, { tipo: 'multi_opcion', opciones }), [], zona)).toBe('')
  })
})

describe('filaDeExportacion', () => {
  it('arma la fila con el tipo, el origen por nombre y los campos del layout', () => {
    const campos = [campo(1, { tipo: 'numero' }), campo(2)]
    const celdas = filaDeExportacion(
      fila({ tipo: 'cliente', atributos: { campo_1: 35, campo_2: 'La Paz' } }),
      campos,
      CONTEXTO,
    )
    expect(celdas).toEqual(['Ana Pérez', '70011002', 'Cliente', 'Web', 35, 'La Paz'])
  })

  it('un origen que ya no está en la lista sale vacío, no «undefined»', () => {
    expect(filaDeExportacion(fila({ origenId: 'viejo' }), [], CONTEXTO)[3]).toBe('')
    expect(filaDeExportacion(fila({ origenId: null }), [], CONTEXTO)[3]).toBe('')
  })

  it('escrita como CSV, una celda de fórmula sale con apóstrofo y el resto intacto', () => {
    const campos = [campo(1), campo(2)]
    const celdas = filaDeExportacion(
      fila({
        nombre: "=cmd|' /C calc'!A0",
        atributos: { campo_1: '+591 700', campo_2: '@usuario' },
        telefono: '5491122334455',
      }),
      campos,
      CONTEXTO,
    )
    expect(lineaDeCsv(celdas, ';')).toBe(
      "'=cmd|' /C calc'!A0;'+5491122334455;Prospecto;Web;'+591 700;'@usuario",
    )
  })

  it('comillas, comas, saltos de línea y emojis en una nota', () => {
    const campos = [campo(1, { tipo: 'texto_largo' })]
    const celdas = filaDeExportacion(
      fila({ atributos: { campo_1: 'Dijo "ok", luego\nvolvió 🚗' } }),
      campos,
      CONTEXTO,
    )
    expect(lineaDeCsv(celdas, ',')).toBe(
      'Ana Pérez,70011002,Prospecto,Web,"Dijo ""ok"", luego\nvolvió 🚗"',
    )
  })
})

describe('nombreDeArchivoDeExportacion', () => {
  it('usa el día en la zona de la empresa, no el de UTC', () => {
    expect(nombreDeArchivoDeExportacion('2026-10-15T02:00:00Z', 'America/La_Paz')).toBe(
      'leads-2026-10-14.csv',
    )
    expect(nombreDeArchivoDeExportacion('2026-10-15T15:00:00Z', 'America/La_Paz')).toBe(
      'leads-2026-10-15.csv',
    )
  })
})

describe('nombresDeFiltros', () => {
  it('sólo los nombres, nunca los valores', () => {
    const nombres = nombresDeFiltros({
      busqueda: 'Juan Pérez',
      porClave: {
        origen: { tipo: 'opciones', valores: ['o1'] },
        'a.ciudad': { tipo: 'texto', texto: 'La Paz' },
      },
    })
    expect(nombres).toEqual(['q', 'origen', 'a.ciudad'])
    expect(JSON.stringify(nombres)).not.toContain('Juan')
    expect(JSON.stringify(nombres)).not.toContain('La Paz')
  })

  it('sin búsqueda ni filtros, ninguno', () => {
    expect(nombresDeFiltros({ busqueda: '  ', porClave: {} })).toEqual([])
  })

  it('un nombre que la base rechazaría no viaja', () => {
    expect(
      nombresDeFiltros({
        busqueda: '',
        porClave: {
          'Raro Nombre': { tipo: 'texto', texto: 'x' },
          origen: { tipo: 'opciones', valores: ['o'] },
        },
      }),
    ).toEqual(['origen'])
  })
})

describe('registroDeExportacionDesde', () => {
  it('lee el cupo y el límite', () => {
    expect(registroDeExportacionDesde({ ok: true, restantes: 3 })).toEqual({
      ok: true,
      restantes: 3,
    })
    expect(
      registroDeExportacionDesde({ ok: false, libre_en: '2026-10-15T16:42:00+00:00' }),
    ).toEqual({ ok: false, libreEn: '2026-10-15T16:42:00+00:00' })
  })

  it('una forma rota no es un permiso para exportar', () => {
    expect(registroDeExportacionDesde(null)).toBeNull()
    expect(registroDeExportacionDesde({ ok: true })).toBeNull()
    expect(registroDeExportacionDesde({ ok: false })).toBeNull()
    expect(registroDeExportacionDesde('listo')).toBeNull()
  })
})

describe('consultaDelListado', () => {
  it('conserva los filtros y el modo, y deja afuera el panel, la página y el drawer', () => {
    expect(
      consultaDelListado('?q=Juan&origen=o1&alcance=todos&panel=exportar&cursor=abc&lead=l1'),
    ).toBe('q=Juan&origen=o1&alcance=todos')
  })

  it('conserva los filtros repetidos y los de un campo', () => {
    expect(consultaDelListado('etiqueta=a&etiqueta=b&a.ciudad=La+Paz')).toBe(
      'etiqueta=a&etiqueta=b&a.ciudad=La+Paz',
    )
  })

  it('sin nada, vacía', () => {
    expect(consultaDelListado('')).toBe('')
    expect(consultaDelListado('?panel=exportar')).toBe('')
    expect(
      consultaDelListado(
        '?q=Ana&lead=l1&pestana=seguimientos&panel=editar-seguimiento&seguimiento=s1',
      ),
    ).toBe('q=Ana')
    expect(consultaDelListado('?panel=editar-recordatorio&recordatorio=r1')).toBe('')
  })
})
