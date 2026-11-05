// Lo que entrega `cotizacion_hoja_guardada()` (4.15-2), para las pruebas de la hoja de una guardada: la fila y el snapshot recortados, el diseño de la hoja de prueba sin la
// hoja abierta (la base no la da), `puede_guardar`, la vigencia y la cadena. Sólo para las pruebas (el sufijo `.soporte.` lo deja fuera del mapa).
import { crudaDeLaHoja } from './hoja-de-prueba.soporte'

export const ID_DE_LA_COTIZACION = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const ID = '00000000-0000-0000-0000-000000000001'
// El texto de la base, con sus microsegundos: nunca pasa por un `Date`.
export const ACTUALIZADO_EN = '2026-11-03T14:20:31.123456+00:00'

export const crudaDeUnaGuardada = (mas: Record<string, unknown> = {}) => {
  // El diseño de la hoja de prueba, sin lo que sólo tiene la hoja nueva: ni la hoja abierta, ni su hora, ni si el vehículo es obligatorio.
  const { estado: _estado, abierta_en, abierta, vehiculo_obligatorio, ...diseno } = crudaDeLaHoja()
  void [abierta_en, abierta, vehiculo_obligatorio]
  return {
    cotizacion: {
      id: ID_DE_LA_COTIZACION,
      numero: 41,
      origen_id: ID,
      lead_id: null,
      vehiculo_id: null,
      creado_por: ID,
      clase: 'preventa',
      estado: 'cotizada',
      titulo: null,
      formula_id: ID,
      total_base: 2350,
      modo_tc: null,
      notas: null,
      version: 1,
      cotizacion_padre_id: null,
      creado_en: '2026-11-03T14:00:00.000000+00:00',
      actualizado_en: ACTUALIZADO_EN,
      ver_total_bs: false,
    },
    valores: { remate: 1000, variante: 'gasolina', cuenta: 0, total: 2350 },
    fuentes: { remate: 'input', variante: 'input' },
    totales: { usd: 2350, bs: null, suma_usd: null },
    tipos_cambio: {},
    ...diseno,
    estado: 'lista',
    origen: { id: ID, nombre: 'Subasta' },
    puede_guardar: true,
    publicada: { id: ID, version: 3 },
    vence_el: '2026-12-03',
    vencida: false,
    anterior: null,
    encima: null,
    puede_cotizar_encima: false,
    ...mas,
  }
}
