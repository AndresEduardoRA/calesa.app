import { describe, expect, it } from 'vitest'
import {
  aCuerpoConTokens,
  claveDeReferencia,
  comandoDelTexto,
  consultaAbierta,
  etiquetaDeMencion,
  etiquetaLibre,
  MAXIMO_DE_MENCIONES,
  mencionesDelCuerpo,
  partirCuerpo,
  referenciaDeUrl,
} from './menciones'

const LEAD = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const VEHICULO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
}

describe('partirCuerpo', () => {
  it('conserva el texto y devuelve las menciones en orden', () => {
    const cuerpo = `Revisa #[lead:${LEAD}] y también #[vehiculo:${VEHICULO}] hoy\nGracias`
    const trozos = partirCuerpo(cuerpo)
    expect(trozos).toEqual([
      { tipo: 'texto', texto: 'Revisa ' },
      { tipo: 'mencion', clase: 'lead', id: LEAD, token: `#[lead:${LEAD}]` },
      { tipo: 'texto', texto: ' y también ' },
      { tipo: 'mencion', clase: 'vehiculo', id: VEHICULO, token: `#[vehiculo:${VEHICULO}]` },
      { tipo: 'texto', texto: ' hoy\nGracias' },
    ])
    const rearmado = trozos.map((t) => (t.tipo === 'texto' ? t.texto : t.token)).join('')
    expect(rearmado).toBe(cuerpo)
  })

  it.each([
    ['un # suelto', 'hola #1 y # nada'],
    ['un token sin uuid', '#[lead:xx]'],
    ['un tipo desconocido', `#[tarea:${LEAD}]`],
    ['un uuid corto', '#[lead:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa]'],
    ['sin cerrar', `#[lead:${LEAD}`],
  ])('deja %s como texto', (_nombre, cuerpo) => {
    expect(partirCuerpo(cuerpo)).toEqual([{ tipo: 'texto', texto: cuerpo }])
  })

  it('un cuerpo vacío no tiene trozos', () => {
    expect(partirCuerpo('')).toEqual([])
  })

  it('normaliza a minúsculas el uuid con letras A-F, como la base', () => {
    const mayusculas = LEAD.toUpperCase()
    const [trozo] = partirCuerpo(`#[lead:${mayusculas}]`)
    expect(trozo).toMatchObject({ tipo: 'mencion', clase: 'lead', id: LEAD })
  })
})

describe('mencionesDelCuerpo', () => {
  it('deduplica por clase e id, en orden de aparición', () => {
    const cuerpo = `#[lead:${LEAD}] #[vehiculo:${VEHICULO}] #[lead:${LEAD.toUpperCase()}] #[usuario:${LEAD}]`
    expect(mencionesDelCuerpo(cuerpo)).toEqual([
      { clase: 'lead', id: LEAD },
      { clase: 'vehiculo', id: VEHICULO },
      { clase: 'usuario', id: LEAD },
    ])
  })

  it('corta en el máximo de menciones', () => {
    const cuerpo = Array.from({ length: 25 }, (_, i) => `#[lead:${uuid(i)}]`).join(' ')
    const referencias = mencionesDelCuerpo(cuerpo)
    expect(referencias).toHaveLength(MAXIMO_DE_MENCIONES)
    expect(referencias[0]).toEqual({ clase: 'lead', id: uuid(0) })
  })

  it('sin menciones no hay referencias', () => {
    expect(mencionesDelCuerpo('nada que ver')).toEqual([])
  })
})

describe('referenciaDeUrl', () => {
  it('lee clase:id y devuelve la referencia', () => {
    expect(referenciaDeUrl(`lead:${LEAD}`)).toEqual({ clase: 'lead', id: LEAD })
    expect(claveDeReferencia({ clase: 'lead', id: LEAD })).toBe(`lead:${LEAD}`)
  })

  it.each([null, '', 'lead', 'lead:xx', `tarea:${LEAD}`, `lead:${LEAD}] #[lead:${LEAD}`])(
    'un valor ilegible (%s) no es una referencia',
    (valor) => {
      expect(referenciaDeUrl(valor)).toBeNull()
    },
  )
})

describe('consultaAbierta', () => {
  it.each([
    ['#', 1, { inicio: 0, texto: '' }],
    ['Mira #Man', 9, { inicio: 5, texto: 'Man' }],
    ['hola\n#Ana', 9, { inicio: 5, texto: 'Ana' }],
    ['#124', 4, { inicio: 0, texto: '124' }],
  ])('abre con %j', (texto, cursor, esperado) => {
    expect(consultaAbierta(texto, cursor)).toEqual(esperado)
  })

  it.each([
    ['mi#x', 4],
    ['#una dos', 8],
    [`#[lead:${LEAD}`, 14],
    ['Mira #Man', 3],
    ['#[x', 3],
  ])('no abre con %j', (texto, cursor) => {
    expect(consultaAbierta(texto, cursor)).toBeNull()
  })

  it('mira sólo lo que hay antes del cursor', () => {
    expect(consultaAbierta('#Ana López', 4)).toEqual({ inicio: 0, texto: 'Ana' })
  })

  it('corta en 60 caracteres', () => {
    expect(consultaAbierta(`#${'a'.repeat(60)}`, 61)?.texto).toHaveLength(60)
    expect(consultaAbierta(`#${'a'.repeat(61)}`, 62)).toBeNull()
  })
})

describe('etiquetas de mención', () => {
  it('colapsa blancos, corta en 60 y usa la alternativa si el nombre viene vacío', () => {
    expect(etiquetaDeMencion('  Ana \n  López ', 'Lead 1')).toBe('#Ana López')
    expect(etiquetaDeMencion('x'.repeat(80), 'Lead 1')).toBe(`#${'x'.repeat(60)}`)
    expect(etiquetaDeMencion('   ', 'Lead 124')).toBe('#Lead 124')
  })

  it('la misma referencia conserva su etiqueta y otra con el mismo nombre toma un sufijo', () => {
    const a = { clase: 'lead' as const, id: LEAD, etiqueta: '#Ana' }
    const otra = { clase: 'lead' as const, id: VEHICULO }
    expect(etiquetaLibre('#Ana', { clase: 'lead', id: LEAD }, [a])).toBe('#Ana')
    expect(etiquetaLibre('#Ana', otra, [a])).toBe('#Ana (2)')
    const b = { ...otra, etiqueta: '#Ana (2)' }
    expect(etiquetaLibre('#Ana', { clase: 'lead', id: uuid(3) }, [a, b])).toBe('#Ana (3)')
  })
})

describe('aCuerpoConTokens', () => {
  const lead = { clase: 'lead' as const, id: LEAD.toUpperCase(), etiqueta: '#Ana' }

  it('vuelve token la etiqueta elegida, con el id en minúsculas, y la cuenta una vez', () => {
    const r = aCuerpoConTokens('Mira #Ana y #Ana otra vez', [lead])
    expect(r.cuerpo).toBe(`Mira #[lead:${LEAD}] y #[lead:${LEAD}] otra vez`)
    expect(r.menciones).toEqual([{ clase: 'lead', id: LEAD }])
    expect(r.demasiadas).toBe(false)
  })

  it('la etiqueta más larga gana y #Anabel no se come por #Ana', () => {
    const larga = { clase: 'vehiculo' as const, id: VEHICULO, etiqueta: '#Ana López' }
    const r = aCuerpoConTokens('#Ana López, #Ana y #Anabel', [lead, larga])
    expect(r.cuerpo).toBe(`#[vehiculo:${VEHICULO}], #[lead:${LEAD}] y #Anabel`)
    expect(r.menciones).toEqual([
      { clase: 'vehiculo', id: VEHICULO },
      { clase: 'lead', id: LEAD },
    ])
  })

  it('una etiqueta editada queda como texto y no menciona', () => {
    const r = aCuerpoConTokens('Mira #An', [lead])
    expect(r).toEqual({ cuerpo: 'Mira #An', menciones: [], demasiadas: false })
  })

  it('un # pegado a una palabra no se convierte', () => {
    expect(aCuerpoConTokens('mi#Ana', [lead]).menciones).toEqual([])
  })

  it('un token pegado a mano también entra en menciones', () => {
    const r = aCuerpoConTokens(`ver #[vehiculo:${VEHICULO}]`, [])
    expect(r.menciones).toEqual([{ clase: 'vehiculo', id: VEHICULO }])
  })

  it('sin elegidas el texto sale igual', () => {
    expect(aCuerpoConTokens('hola #1', [])).toEqual({
      cuerpo: 'hola #1',
      menciones: [],
      demasiadas: false,
    })
  })

  it('el nombre con caracteres de expresión regular se escapa', () => {
    const raro = { clase: 'lead' as const, id: LEAD, etiqueta: '#A.* (b)' }
    expect(aCuerpoConTokens('#A.* (b) y #Axx', [raro]).cuerpo).toBe(`#[lead:${LEAD}] y #Axx`)
  })

  it('más de 20 distintas son demasiadas', () => {
    const elegidas = Array.from({ length: 21 }, (_, i) => ({
      clase: 'lead' as const,
      id: uuid(i),
      etiqueta: `#L${String.fromCharCode(97 + i)}`,
    }))
    const texto = elegidas.map((e) => e.etiqueta).join(' ')
    expect(aCuerpoConTokens(texto, elegidas).demasiadas).toBe(true)
    expect(aCuerpoConTokens(texto, elegidas.slice(0, 20)).demasiadas).toBe(false)
  })
})

describe('comandoDelTexto', () => {
  it('reconoce /tarea y /evento al principio, con o sin resto, sin distinguir mayúsculas', () => {
    expect(comandoDelTexto('/tarea', 120)).toEqual({ comando: 'tarea', resto: '' })
    expect(comandoDelTexto('/tarea Revisar el contenedor', 120)).toEqual({
      comando: 'tarea',
      resto: 'Revisar el contenedor',
    })
    expect(comandoDelTexto('  /evento reunión ', 120)).toEqual({
      comando: 'evento',
      resto: 'reunión',
    })
    expect(comandoDelTexto('/TAREA algo', 120)).toEqual({ comando: 'tarea', resto: 'algo' })
    expect(comandoDelTexto('/tarea\nlínea', 120)).toEqual({ comando: 'tarea', resto: 'línea' })
  })

  it('no es comando si no empieza el texto con él o si sigue una letra', () => {
    for (const texto of [
      '/tareas',
      'mi /tarea',
      '/otra',
      `#[lead:${LEAD}] /tarea`,
      '',
      '   ',
      '/',
    ]) {
      expect(comandoDelTexto(texto, 120)).toBeNull()
    }
  })

  it('corta el resto en el largo máximo', () => {
    const r = comandoDelTexto(`/tarea ${'a'.repeat(300)}`, 120)
    expect(r?.resto).toHaveLength(120)
  })
})
