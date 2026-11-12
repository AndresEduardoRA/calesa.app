import { describe, expect, it } from 'vitest'
import {
  detalleDeEventoDesde,
  detalleDeTareaDesde,
  leerIdDeUrl,
  originalDeTarea,
  rutaDeVinculo,
  type FilaDeEvento,
  type FilaDeTarea,
} from './detalle'

const YO = '00000000-0000-4000-8000-000000000001'
const OTRA = '00000000-0000-4000-8000-000000000002'
const NOMBRES = { [YO]: 'Dueña', [OTRA]: 'Berta' }

const filaDeEvento: FilaDeEvento = {
  id: '00000000-0000-4000-8000-0000000000e1',
  titulo: 'Visita',
  descripcion: null,
  lugar: 'Oficina',
  inicia_en: '2026-11-12T13:00:00+00:00',
  termina_en: null,
  visibilidad: 'seleccionados',
  estado: 'pendiente',
  creado_por: YO,
  actualizado_en: '2026-11-11T14:00:00+00:00',
  lead_id: null,
  vehiculo_id: '00000000-0000-4000-8000-0000000000v1',
  cotizacion_id: null,
}

const filaDeTarea: FilaDeTarea = {
  id: '00000000-0000-4000-8000-0000000000t1',
  titulo: 'Llamar',
  descripcion: 'Antes de las 5',
  vence_en: '2026-11-12T22:00:00+00:00',
  estado: 'pendiente',
  completada_en: null,
  responsable_id: OTRA,
  creado_por: YO,
  actualizado_en: '2026-11-11T14:00:00+00:00',
  lead_id: null,
  vehiculo_id: null,
  cotizacion_id: null,
}

describe('detalleDeEventoDesde', () => {
  it('el creador ve la lista de destinatarios con sus nombres', () => {
    const detalle = detalleDeEventoDesde(filaDeEvento, NOMBRES, [OTRA], YO)
    expect(detalle.destinatarios).toEqual([{ id: OTRA, nombre: 'Berta' }])
    expect(detalle.creadoPorNombre).toBe('Dueña')
    expect(detalle.vinculos.vehiculo).toBe(filaDeEvento.vehiculo_id)
  })

  it('quien no lo creó no recibe la lista, aunque la lectura la haya traído', () => {
    const detalle = detalleDeEventoDesde(filaDeEvento, NOMBRES, [OTRA], OTRA)
    expect(detalle.destinatarios).toBeNull()
  })

  it('un evento que no es «seleccionados» no tiene lista ni para su creador', () => {
    const detalle = detalleDeEventoDesde(
      { ...filaDeEvento, visibilidad: 'publico' },
      NOMBRES,
      [],
      YO,
    )
    expect(detalle.destinatarios).toBeNull()
  })

  it('un destinatario sin nombre legible no tumba el panel', () => {
    const detalle = detalleDeEventoDesde(filaDeEvento, {}, [OTRA], YO)
    expect(detalle.destinatarios?.[0]?.nombre).toBeTruthy()
    expect(detalle.creadoPorNombre).toBeNull()
  })
})

describe('detalleDeTareaDesde', () => {
  it('trae responsable y creador por nombre, y lo que edita el formulario', () => {
    const detalle = detalleDeTareaDesde(filaDeTarea, NOMBRES)
    expect(detalle.responsableNombre).toBe('Berta')
    expect(detalle.creadoPorNombre).toBe('Dueña')
    expect(originalDeTarea(detalle)).toEqual({
      titulo: 'Llamar',
      descripcion: 'Antes de las 5',
      venceEn: '2026-11-12T22:00:00+00:00',
      responsable: { id: OTRA, nombre: 'Berta' },
    })
  })
})

describe('rutaDeVinculo y leerIdDeUrl', () => {
  it('cada vínculo lleva a su ficha', () => {
    expect(rutaDeVinculo('lead', 'x')).toBe('/leads/x')
    expect(rutaDeVinculo('vehiculo', 'x')).toBe('/vehiculos/x')
    expect(rutaDeVinculo('cotizacion', 'x')).toBe('/cotizaciones/x')
  })

  it('un id de la URL es un uuid o se ignora', () => {
    expect(leerIdDeUrl(YO)).toBe(YO)
    expect(leerIdDeUrl('no-es-un-id')).toBeNull()
    expect(leerIdDeUrl(undefined)).toBeNull()
  })
})
