// Publicar o sacar de la web desde la lista (B3): lo que se manda a `vehiculo_vitrina` a partir de lo que la fila ya tiene guardado. Sin I/O.
import type { Vehiculo } from './vehiculo'
import type { DatosDeVitrina } from './vitrina'

export type DeLaFila = Pick<
  Vehiculo,
  | 'id'
  | 'titulo'
  | 'actualizadoEn'
  | 'publicadoWeb'
  | 'precioWeb'
  | 'precioWebHasta'
  | 'precioWebNota'
  | 'destacadoWeb'
>

// Lo que la fila ya tiene guardado de la vitrina, con lo que cambia (publicar con un precio, o sacar). Un «hasta» menor que el precio nuevo se
// suelta: la base lo rechazaría. Sacar apaga también el destacado, como el panel.
export function datosDeLaFila(
  vehiculo: DeLaFila,
  publicado: boolean,
  precio?: number | null,
): DatosDeVitrina {
  const nuevoPrecio = precio === undefined ? vehiculo.precioWeb : precio
  const hasta =
    nuevoPrecio !== null &&
    vehiculo.precioWebHasta !== null &&
    vehiculo.precioWebHasta >= nuevoPrecio
      ? vehiculo.precioWebHasta
      : null
  return {
    publicado,
    precio: nuevoPrecio,
    precioHasta: nuevoPrecio === null ? null : hasta,
    nota: vehiculo.precioWebNota,
    destacado: publicado ? vehiculo.destacadoWeb : false,
  }
}
