import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Arnes, pasoFalla, pasoListo, responder } from './bucle.arnes'

// La compuerta «producto» con una pregunta por decisión (CAL-1). El paso la pide con `compuerta.preguntas` (id, pregunta, de 2 a 4
// opciones; la recomendada primero); el bucle las escribe en compuerta.md con cuántas tandas de 4 son, y acepta la decisión entera
// (el hook escribe decision.md sólo cuando están todas). «parar» en cualquiera para el bucle; el resto lo lee el paso de hechos.json.
vi.setConfig({ testTimeout: 60_000 })

let a: Arnes
beforeEach(() => {
  a = new Arnes()
})
afterEach(() => a.limpiar())

const opciones = (n = 2) =>
  [
    { etiqueta: 'sí', descripcion: 'la recomendada (recomendado)' },
    { etiqueta: 'no', descripcion: 'la otra' },
    { etiqueta: 'tal vez', descripcion: 'la tercera' },
    { etiqueta: 'nunca', descripcion: 'la cuarta' },
    { etiqueta: 'siempre', descripcion: 'la quinta' },
  ].slice(0, n)

function pasoProducto(preguntas: unknown[] | undefined) {
  const compuerta = {
    tipo: 'producto',
    motivo: 'el plan deja decisiones abiertas',
    ...(preguntas ? { preguntas } : {}),
    contexto: ['.piloto/planes/4.99.md'],
  }
  const ultimo = {
    paso: '4.99',
    resultado: 'compuerta',
    resumen: 'plan con preguntas',
    commits: [],
    e2e_dirigidos: [],
    compuerta,
  }
  return `mkdir -p .piloto && cat > .piloto/ultimo.json <<'EOF'\n${JSON.stringify(ultimo)}\nEOF`
}
const seis = Array.from({ length: 6 }, (_, i) => ({
  id: `P${i}`,
  pregunta: `¿Decisión ${i}?`,
  opciones: opciones(),
}))

/** Lo que escribe el hook cuando la persona contestó todas las tandas. */
function responderTodas(respuestas: string[]) {
  const lineas = respuestas.map((r, i) => `- P${i}: ${r}`).join('\\n')
  return `sleep 0.3
printf 'id: %s\\nopcion: varias\\nnotas: \\ncreada: %s\\nrespuestas:\\n${lineas}\\nme respondió: «varias»\\n' "$ID" "$(date +%s)" > "$COMUN/decision.md"`
}

describe('bucle.sh › la compuerta de producto, una pregunta por decisión', () => {
  it('compuerta.md lleva las seis preguntas con sus opciones, en dos tandas', () => {
    a.paso(1, pasoProducto(seis))
    a.decidir(1, responderTodas(['parar', 'no', 'no', 'no', 'no', 'no']))
    a.correr()
    const c = a.leerFake('compuerta-1.md')
    expect(c).toContain('tipo: producto')
    expect(c).toContain('preguntas: 6\ntandas: 2\n')
    expect(c).toContain(
      '- P0: ¿Decisión 0?\n  - sí — la recomendada (recomendado)\n  - no — la otra\n',
    )
    expect(c).toContain('- P5: ¿Decisión 5?\n')
  })

  it('con todas contestadas el paso se retoma y lee de hechos.json cada respuesta, aunque pasen de 3.000 B', () => {
    const larga = (i: number) => `respuesta ${i} `.repeat(70)
    a.paso(1, pasoProducto(seis))
    a.decidir(1, responderTodas([0, 1, 2, 3, 4, 5].map(larga)))
    a.paso(2, `cp .piloto/hechos.json "$FAKE_DIR/hechos-2.json"\n${pasoListo({ 'src/a.ts': 'a' })}`)
    const r = a.correr(['--hasta', '4.99'])
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')[1]).toContain('-p /piloto 4.99 continuar')
    const decision = JSON.parse(a.leerFake('hechos-2.json')).decision as string
    expect(decision.length).toBeGreaterThan(3000)
    expect(decision).toContain(`- P5: ${larga(5)}`)
  })

  it('las preguntas no se cuelan en la compuerta siguiente (un aviso después de la de producto)', () => {
    a.paso(1, pasoProducto(seis))
    a.decidir(1, responderTodas(['sí', 'sí', 'sí', 'sí', 'sí', 'sí']))
    a.paso(2, pasoFalla())
    a.decidir(2, responder('parado'))
    a.correr()
    expect(a.leerFake('compuerta-2.md')).toContain('tipo: parada')
    expect(a.leerFake('compuerta-2.md')).not.toContain('preguntas:')
  })

  it('«parar» en cualquiera de las decisiones para el bucle', () => {
    a.paso(1, pasoProducto(seis))
    a.decidir(1, responderTodas(['sí', 'sí', 'sí', 'parar', 'sí', 'sí']))
    const r = a.correr()
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(1)
    expect(a.estado('registro.md')).toContain('parado por la persona en la compuerta de 4.99')
  })

  it('una respuesta que empieza con «no» («no partir») no es «parar»', () => {
    a.paso(1, pasoProducto(seis))
    a.decidir(1, responderTodas(['no partir', 'no', 'no', 'no', 'no', 'no']))
    a.paso(2, pasoListo({ 'src/a.ts': 'a' }))
    const r = a.correr(['--hasta', '4.99'])
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(2)
  })
})

describe('bucle.sh › una compuerta de producto mal formada es un fallo del proceso (un reintento)', () => {
  it.each([
    ['sin preguntas', undefined],
    ['sin ninguna pregunta', []],
    ['con una pregunta de cinco opciones', [{ id: 'P0', pregunta: '¿?', opciones: opciones(5) }]],
    ['con una de una sola opción', [{ id: 'P0', pregunta: '¿?', opciones: opciones(1) }]],
    [
      'con un id de más de 12 caracteres (va de header)',
      [{ id: 'P0-demasiado-largo', pregunta: '¿?', opciones: opciones() }],
    ],
    ['con dos preguntas del mismo id', [seis[0], seis[0]]],
    [
      'con 13 preguntas',
      Array.from({ length: 13 }, (_, i) => ({ id: `P${i}`, pregunta: '¿?', opciones: opciones() })),
    ],
  ])('%s', (_nombre, preguntas) => {
    a.paso(1, pasoProducto(preguntas))
    a.paso(2, pasoListo({ 'src/a.ts': 'a' }))
    const r = a.correr(['--hasta', '4.99'])
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(2)
    expect(a.estado('consumo.csv')).toContain('fallo-proceso')
  })
})
