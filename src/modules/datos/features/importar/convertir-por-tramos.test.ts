import { describe, expect, it, vi } from 'vitest'
import {
  objetivosDeImportacion,
  prepararFilas,
  type ContextoDeImportacion,
  type EntradaDePreparacion,
} from '@/modules/leads/client'
import { camposComunes, type Fuentes } from '@/modules/vehiculos/client'
import { filaNormalizadaDeLead } from './convertir-leads'
import { convertirPorTramos, tramoDeLeads, tramoDeVehiculos } from './convertir-por-tramos'
import { objetivosDeVehiculos, prepararVehiculos } from './convertir-vehiculos'

// `leads/client` reexporta una Server Action: en el navegador el bundler la cambia por una referencia; en Vitest, no.
vi.mock('server-only', () => ({}))

const WEB = '11111111-1111-4111-8111-111111111111'
const TIPO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

const CONTEXTO: ContextoDeImportacion = {
  telefonoCc: '+591',
  origenes: [{ id: WEB, clave: 'web', nombre: 'Web' }],
  tipos: [{ id: TIPO, clave: 'prospecto', nombre: 'Prospecto', clase: 'prospecto' }],
  tipoPorDefectoId: TIPO,
  tiposDeSeguimiento: [],
  ultimoOrigenId: null,
  origenPorDefectoId: null,
  topes: { origenes: 100, tipos: 100, tiposDeSeguimiento: 100 },
  empresa: { ciudad: null, pais: null },
}

// Con tramos de 2: la fila 5 repite la 2 (otro tramo) y la 6 repite la 4, que está en el segundo tramo (cae si se numera sin `desde`).
const LEADS = [
  ['Ana', '70000001'],
  ['', '70000002'],
  ['Caro', '70000003'],
  ['Dani', '+591 70000001'],
  ['Eva', '70000003'],
]

function entradaDeLeads(): Omit<EntradaDePreparacion, 'filas'> {
  let n = 0
  return {
    destinos: ['nombre', 'telefono_principal'],
    campos: [],
    contexto: CONTEXTO,
    zona: 'America/La_Paz',
    locale: 'es-BO',
    eleccion: { origenId: WEB, tipoLeadId: TIPO },
    nuevoId: () => `id-${String((n += 1))}`,
  }
}

const objetivosLeads = objetivosDeImportacion([])

const fuentes: Fuentes = {
  comunes: camposComunes('subasta'),
  campos: [],
  categorias: [],
  zona: 'America/La_Paz',
  locale: 'es-BO',
}
const objetivosVehiculos = objetivosDeVehiculos(fuentes)
const VEHICULOS = [
  ['Toyota Hilux', '1000', '20000'],
  ['', '2000', '21000'],
  ['Nissan Frontier', 'mucho', '22000'],
  ['Ford Ranger', '4000', ''],
  ['Mazda BT-50', '5000', '24000'],
]
const destinosVehiculos = ['titulo', 'kilometraje', 'precio']

const inmediato = () => Promise.resolve()

describe('convertirPorTramos', () => {
  it('en leads, un teléfono repetido que cruza el borde de un tramo dice la fila de la primera vez', async () => {
    const filas = await convertirPorTramos({
      total: LEADS.length,
      tramo: tramoDeLeads({ ...entradaDeLeads(), filas: LEADS, objetivos: objetivosLeads }),
      tamano: 2,
      ceder: inmediato,
    })
    const deUnaVez = prepararFilas({ ...entradaDeLeads(), filas: LEADS }).map((fila) =>
      filaNormalizadaDeLead(fila, objetivosLeads),
    )
    expect(filas).toEqual(deUnaVez)
    expect(filas?.[3]).toEqual({
      rechazo: {
        motivo: 'Este teléfono ya está en la fila 2 del archivo.',
        campo: 'Teléfono',
      },
    })
    expect(filas?.[4]).toEqual({
      rechazo: {
        motivo: 'Este teléfono ya está en la fila 4 del archivo.',
        campo: 'Teléfono',
      },
    })
  })

  it('en vehículos da lo mismo que una pasada, con el avance y cediendo entre tramos', async () => {
    const avances: [number, number][] = []
    const ceder = vi.fn(inmediato)
    const entrada = {
      filas: VEHICULOS,
      destinos: destinosVehiculos,
      objetivos: objetivosVehiculos,
      fuentes,
    }
    const filas = await convertirPorTramos({
      total: VEHICULOS.length,
      tramo: tramoDeVehiculos(entrada),
      tamano: 2,
      ceder,
      alAvanzar: (hechas, total) => avances.push([hechas, total]),
    })
    expect(filas).toEqual(prepararVehiculos(entrada))
    expect(filas?.filter((fila) => 'datos' in fila)).toHaveLength(3)
    expect(avances).toEqual([
      [2, 5],
      [4, 5],
      [5, 5],
    ])
    expect(ceder).toHaveBeenCalledTimes(2)
  })

  it('cancelada, devuelve null y no convierte otro tramo', async () => {
    const control = new AbortController()
    const tramo = vi.fn(
      tramoDeVehiculos({
        filas: VEHICULOS,
        destinos: destinosVehiculos,
        objetivos: objetivosVehiculos,
        fuentes,
      }),
    )
    const filas = await convertirPorTramos({
      total: VEHICULOS.length,
      tramo,
      tamano: 2,
      ceder: inmediato,
      senal: control.signal,
      alAvanzar: () => control.abort(),
    })
    expect(filas).toBeNull()
    expect(tramo).toHaveBeenCalledTimes(1)
  })
})
