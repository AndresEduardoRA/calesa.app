import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  agruparResultados,
  ordenarComoLosIds,
  POR_SECCION,
  seccionesQueBuscan,
  ULTIMOS_MOSTRADOS,
  ultimosAbiertos,
  type Interpretacion,
  type Seccion,
} from './ranking'
import {
  ESQUEMAS_DEL_BUSCADOR,
  filasDesde,
  type FilaDeLead,
  type FilaDeVehiculo,
} from './resultados'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const lead = (n: number, nombre: string, numero: number | null = n): FilaDeLead => ({
  id: id(n),
  nombre,
  numero_visible: numero,
})
const vehiculo = (n: number, titulo: string, vin: string | null = null): FilaDeVehiculo => ({
  id: id(n),
  origen_id: id(900),
  titulo,
  vin,
  lote: null,
  creado_en: '2026-11-11T00:00:00Z',
})
const cotizacion = (n: number, titulo: string, numero = n) => ({
  id: id(n),
  numero,
  origen_id: id(900),
  titulo,
  clase: 'oferta',
  estado: 'borrador',
  creado_en: '2026-11-11T00:00:00Z',
})

// Escritas a mano con la forma de `interpretarBusqueda()`: la regla no importa `leads` (la llama la feature que compone).
const texto = (t: string): Interpretacion => ({ texto: t, numero: null, soloNumero: false })
const soloNumero = (n: number): Interpretacion => ({
  texto: String(n),
  numero: n,
  soloNumero: true,
})
const numeroYTexto = (n: number): Interpretacion => ({
  texto: String(n),
  numero: n,
  soloNumero: false,
})

// La sección de un tipo, ya discriminada (falla si llegó otra).
function seccion<T extends Seccion['tipo']>(
  secciones: Seccion[],
  tipo: T,
): Extract<Seccion, { tipo: T }> {
  const encontrada = secciones.find((s): s is Extract<Seccion, { tipo: T }> => s.tipo === tipo)
  if (!encontrada) {
    throw new Error(`sin la sección ${tipo}`)
  }
  return encontrada
}

describe('seccionesQueBuscan', () => {
  // La tabla de la prueba «Mínimo» de `supabase/tests/areas/buscador/buscador.sql` y D10: `#n` no busca vehículos.
  it('nada bajo el mínimo; `#n` busca leads y cotizaciones; un número largo también vehículos; un texto, las tres', () => {
    expect(seccionesQueBuscan(null)).toEqual([])
    expect(seccionesQueBuscan(soloNumero(12))).toEqual(['lead', 'cotizacion'])
    expect(seccionesQueBuscan(numeroYTexto(123))).toEqual(['lead', 'cotizacion', 'vehiculo'])
    expect(seccionesQueBuscan(texto('Rosa'))).toEqual(['lead', 'vehiculo', 'cotizacion'])
  })
})

describe('agruparResultados', () => {
  it('corta cada sección en POR_SECCION y dice si había más', () => {
    const seis = [1, 2, 3, 4, 5, 6].map((n) => lead(n, `Rosa ${n}`))
    const [conSeis] = agruparResultados(texto('rosa'), { lead: seis })
    expect(conSeis?.filas).toHaveLength(POR_SECCION)
    expect(conSeis?.hayMas).toBe(true)
    const [conCinco] = agruparResultados(texto('rosa'), { lead: seis.slice(0, 5) })
    expect(conCinco?.filas).toHaveLength(5)
    expect(conCinco?.hayMas).toBe(false)
  })

  it('sigue el orden de las secciones, omite las vacías e ignora la que no busca', () => {
    const leidas = {
      lead: [lead(1, 'Ana')],
      vehiculo: [vehiculo(2, 'Hilux 12')],
      cotizacion: [cotizacion(3, 'Oferta')],
    }
    expect(agruparResultados(texto('hil'), leidas).map((s) => s.tipo)).toEqual([
      'lead',
      'vehiculo',
      'cotizacion',
    ])
    expect(agruparResultados(soloNumero(12), leidas).map((s) => s.tipo)).toEqual([
      'lead',
      'cotizacion',
    ])
    expect(agruparResultados(texto('hil'), { ...leidas, lead: [] }).map((s) => s.tipo)).toEqual([
      'vehiculo',
      'cotizacion',
    ])
    expect(agruparResultados(null, leidas)).toEqual([])
  })

  it('el número exacto va primero, después lo que empieza con el texto, y el resto conserva el orden de la base', () => {
    const leads = seccion(
      agruparResultados(numeroYTexto(124), {
        lead: [lead(1, 'Juan 1240', 7), lead(2, 'Pedro', 8), lead(3, 'Luis', 124)],
      }),
      'lead',
    )
    expect(leads.filas.map((f) => f.numero_visible)).toEqual([124, 7, 8])

    const porNombre = seccion(
      agruparResultados(texto('ros'), {
        lead: [
          lead(1, 'Barroso'),
          lead(2, 'Rosa Zafra'),
          lead(3, 'Ana Rosales'),
          lead(4, 'Cardoso'),
        ],
      }),
      'lead',
    )
    expect(porNombre.filas.map((f) => f.nombre)).toEqual([
      'Rosa Zafra',
      'Ana Rosales',
      'Barroso',
      'Cardoso',
    ])

    const [vehiculos] = agruparResultados(texto('JTF'), {
      vehiculo: [vehiculo(1, 'Camioneta AJTF'), vehiculo(2, 'Camioneta', 'JTFAB123')],
    })
    expect(vehiculos?.filas.map((f) => f.id)).toEqual([id(2), id(1)])

    const cotizaciones = seccion(
      agruparResultados(soloNumero(9), {
        cotizacion: [cotizacion(1, 'Otra', 90), cotizacion(2, 'Esta', 9)],
      }),
      'cotizacion',
    )
    expect(cotizaciones.filas.map((f) => f.numero)).toEqual([9, 90])
  })
})

describe('ordenarComoLosIds', () => {
  it('sigue el orden de los ids y saca la fila que sobra y el id sin fila', () => {
    const filas = [lead(3, 'C'), lead(1, 'A'), lead(9, 'Sobra')]
    expect(ordenarComoLosIds([id(1), id(2), id(3)], filas).map((f) => f.id)).toEqual([id(1), id(3)])
  })
})

describe('ultimosAbiertos', () => {
  const visita = (tipo: 'lead' | 'vehiculo' | 'cotizacion', n: number) => ({
    tipo,
    referencia_id: id(n),
    visto_en: '2026-11-11T00:00:00Z',
  })

  it('conserva la recencia mezclando tipos y saca lo que no llegó (no se ve, papelera o purgado)', () => {
    const abiertos = ultimosAbiertos(
      [visita('vehiculo', 2), visita('lead', 1), visita('cotizacion', 3), visita('lead', 4)],
      {
        lead: [lead(1, 'Ana')],
        vehiculo: [vehiculo(2, 'Hilux')],
        cotizacion: [cotizacion(3, 'Oferta')],
      },
    )
    expect(abiertos.map((a) => `${a.tipo}:${a.fila.id}`)).toEqual([
      `vehiculo:${id(2)}`,
      `lead:${id(1)}`,
      `cotizacion:${id(3)}`,
    ])
  })

  it('corta en ULTIMOS_MOSTRADOS', () => {
    const muchos = Array.from({ length: ULTIMOS_MOSTRADOS + 3 }, (_, i) => lead(i + 1, `L${i}`))
    const abiertos = ultimosAbiertos(
      muchos.map((_, i) => visita('lead', i + 1)),
      { lead: muchos },
    )
    expect(abiertos).toHaveLength(ULTIMOS_MOSTRADOS)
  })
})

describe('filasDesde', () => {
  it('valida lo que llega y da null si una fila no cumple', () => {
    expect(filasDesde(ESQUEMAS_DEL_BUSCADOR.lead, [lead(1, 'Ana')])).toHaveLength(1)
    expect(
      filasDesde(ESQUEMAS_DEL_BUSCADOR.lead, [{ id: 'x', nombre: 'Ana', numero_visible: 1 }]),
    ).toBeNull()
    expect(filasDesde(ESQUEMAS_DEL_BUSCADOR.ids, null)).toEqual([])
    expect(filasDesde(z.array(z.string()), [1])).toBeNull()
  })
})
