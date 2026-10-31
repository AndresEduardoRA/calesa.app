import type { CodigoDeFaltante } from './motor-contexto'

// Lo que dice una celda por un faltante del recálculo. **Los textos son de este archivo y nunca el mensaje de la base**: un mensaje del motor puede nombrar un nodo que quien
// mira no ve.

export const SE_ELIGE_EN_EL_PANEL =
  'Elige el dato del vehículo en «Vehículo», arriba de la hoja, o escribe el valor.'

// `seElige`: el dato del vehículo de la celda se elige en el panel del vehículo (4.14-2c3); sin valor o sin fila, dice dónde.
export function textoDelFaltante(codigo: CodigoDeFaltante, seElige = false): string {
  return seElige && (codigo === 'campo_sin_valor' || codigo === 'fila_sin_coincidencia')
    ? SE_ELIGE_EN_EL_PANEL
    : textoDeSiempre(codigo)
}

function textoDeSiempre(codigo: CodigoDeFaltante): string {
  switch (codigo) {
    case 'fuera_de_rango':
      return 'El valor está fuera de rango.'
    case 'requerido_sin_valor':
      return 'Este dato es obligatorio.'
    case 'campo_sin_valor':
      return 'Falta un dato del vehículo.'
    case 'tabla_sin_filas':
      return 'La tabla de referencia no tiene filas.'
    case 'fila_sin_coincidencia':
      return 'La tabla no tiene un valor para este caso: escríbelo.'
    case 'celda_sin_valor':
      return 'A la tabla le falta un valor.'
    case 'division_por_cero':
      return 'Se divide por cero.'
    case 'tipo_de_cambio_sin_valor':
      return 'Falta el tipo de cambio.'
    default: {
      const _: never = codigo
      return _
    }
  }
}
