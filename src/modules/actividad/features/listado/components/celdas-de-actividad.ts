// Los textos de una fila de la actividad, comunes a la tabla y a las tarjetas.
import type { FilaDeActividad } from '../../../entities/actividad'
import {
  etiquetaDeCampo,
  etiquetaDeEntidad,
  nombreDelActor,
  verboDeLaAccion,
} from '../../../entities/etiquetas'

// Hasta 5 campos que cambiaron, con su etiqueta, y «y más» si la base dice que hay otros. Una fila sin acceso no dice qué.
export function textoDeLosCampos(fila: FilaDeActividad): string {
  if (!fila.visible) {
    return 'Sin acceso al detalle'
  }
  if (fila.campos.length === 0) {
    return '—'
  }
  const campos = fila.campos.map((clave) => etiquetaDeCampo(fila.tabla, clave)).join(', ')
  return fila.masCampos ? `${campos} y más` : campos
}

export function textosDeLaFila(fila: FilaDeActividad) {
  return {
    persona: nombreDelActor(fila),
    accion: verboDeLaAccion(fila.accion),
    entidad: etiquetaDeEntidad(fila.tabla),
    campos: textoDeLosCampos(fila),
  }
}
