// El recordatorio del primer seguimiento: atajos de fecha y la comprobación de que sea a futuro. La
// hora que se escribe es la de la empresa (como un campo de fecha y hora); lo que viaja es el
// instante en UTC.
import { diaEnZona, instanteDeLocal, sumarDias } from '@/shared/lib/fechas'

// La hora a la que caen «mañana» y «en 3 días».
export const HORA_DEL_RECORDATORIO = '09:00'

export type AtajoDeFecha = {
  clave: 'manana' | 'en_3_dias'
  etiqueta: string
  // `aaaa-mm-ddThh:mm`, en la zona de la empresa: lo que lleva un <input type="datetime-local">.
  local: string
}

// Los atajos a partir de «ahora» (ISO), vistos desde la zona de la empresa: pasada la medianoche
// allá, «mañana» ya es otro día.
export function atajosDeFecha(ahora: string, zona: string): AtajoDeFecha[] {
  const hoy = diaEnZona(ahora, { zona })
  return [
    {
      clave: 'manana',
      etiqueta: `Mañana ${HORA_DEL_RECORDATORIO}`,
      local: `${sumarDias(hoy, 1)}T${HORA_DEL_RECORDATORIO}`,
    },
    {
      clave: 'en_3_dias',
      etiqueta: `En 3 días ${HORA_DEL_RECORDATORIO}`,
      local: `${sumarDias(hoy, 3)}T${HORA_DEL_RECORDATORIO}`,
    },
  ]
}

export type RecordatorioValido = { ok: true; recordarEn: string } | { ok: false; motivo: string }

// El valor escrito (`datetime-local`) como instante, y que sea posterior a «ahora». Los mismos
// motivos que la base (`crear_lead()`), con el campo en el mismo lugar.
export function validarRecordatorio(
  local: string,
  ahora: string,
  zona: string,
): RecordatorioValido {
  const instante = instanteDeLocal(local, { zona })
  if (!instante) {
    return { ok: false, motivo: 'Elige cuándo recordarlo.' }
  }
  if (Date.parse(instante) <= Date.parse(ahora)) {
    return { ok: false, motivo: 'El recordatorio tiene que ser en el futuro.' }
  }
  return { ok: true, recordarEn: instante }
}
