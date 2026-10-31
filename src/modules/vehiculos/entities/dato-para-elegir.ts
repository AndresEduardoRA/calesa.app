import type { Resultado } from '@/shared/lib/errores'
import type { CampoDeVehiculo, TipoDeCampo } from './campo'
import type { Vehiculo } from './vehiculo'

// El dato del vehículo que se elige en el panel de la hoja de cotizar entre las filas de una tabla (4.14-2c3): el tipo de vehículo del transporte. `vehiculos` no conoce
// `cotizaciones`: las formas de abajo son estructurales y la página de cotizar las une.

export type TablaDelDato = { tabla: string; columna: string }
// Lo que la hoja dice que casa con una tabla (un campo del layout o una columna fija del vehículo).
export type DatoDeLaHoja = { campo: string; tablas: readonly TablaDelDato[] }
export type DatoParaElegir = {
  campo: string
  valor: string | null
  tablas: readonly TablaDelDato[]
}
// Lo que viaja a la barra con un elegido: la versión que se manda al guardar, si quien mira lo puede editar y los datos que se eligen.
export type ParaElegir = { version: string; editable: boolean; datos: DatoParaElegir[] }

// Lo que recibe el panel: lo de arriba más el lector de las opciones, que la página arma en el navegador (una función no viaja del servidor).
export type ParaElegirConLector = ParaElegir & { leerOpciones: LectorDeOpciones }

export type OpcionesDelDato = { etiqueta: string | null; opciones: string[]; hayMas: boolean }
export type LectorDeOpciones = (
  tablas: readonly TablaDelDato[],
) => Promise<Resultado<OpcionesDelDato>>

// Sólo un texto se elige: un número se leería con el locale y una opción exigiría que la clave de la fila sea una de las suyas (límite del 2c3, `docs/DECISIONES.md`).
export const TIPOS_QUE_SE_ELIGEN: readonly TipoDeCampo[] = ['texto', 'texto_largo']

// Se elige un campo activo del layout de texto. Una columna fija (`anio`…) nunca es un campo del layout (`CLAVES_RESERVADAS` de `origenes`): queda fuera sin lista propia.
export const campoQueSeElige = (campo: Pick<CampoDeVehiculo, 'tipo' | 'activo'>): boolean =>
  campo.activo && TIPOS_QUE_SE_ELIGEN.includes(campo.tipo)

// Los datos de la hoja que el panel ofrece para este vehículo, con su valor (sólo un texto cuenta); null si no hay ninguno: nada viaja ni se dibuja.
export function datosParaElegirDe(
  vehiculo: Pick<Vehiculo, 'atributos' | 'actualizadoEn'>,
  datos: readonly DatoDeLaHoja[],
  campos: readonly Pick<CampoDeVehiculo, 'clave' | 'tipo' | 'activo'>[],
  editable: boolean,
): ParaElegir | null {
  const elegibles = new Set(campos.filter(campoQueSeElige).map((campo) => campo.clave))
  const paraElegir = datos
    .filter((dato) => elegibles.has(dato.campo))
    .map((dato) => {
      const valor = vehiculo.atributos[dato.campo]
      return {
        campo: dato.campo,
        valor: typeof valor === 'string' ? valor : null,
        tablas: dato.tablas,
      }
    })
  return paraElegir.length === 0
    ? null
    : { version: vehiculo.actualizadoEn, editable, datos: paraElegir }
}

// La opción que coincide con el valor del vehículo: por igualdad estricta de textos, como el motor.
export const marcadaDe = (valor: string | null, opciones: readonly string[]): string | null =>
  valor !== null && opciones.includes(valor) ? valor : null

// Lo que se dibuja tiene tope (`.claude/rules/escala.md`): «Buscar en las opciones» es el camino a las demás.
export const TOPE_DE_OPCIONES = 50

// Las opciones que se dibujan: las que contienen lo buscado (sin distinguir mayúsculas), a lo sumo el tope, con la marcada primera si quedaba fuera.
export function opcionesADibujar(
  opciones: readonly string[],
  marcada: string | null,
  busqueda: string,
): { dibujadas: string[]; hayMasQueElTope: boolean } {
  const buscado = busqueda.trim().toLocaleLowerCase()
  const filtradas =
    buscado === '' ? opciones : opciones.filter((o) => o.toLocaleLowerCase().includes(buscado))
  if (filtradas.length <= TOPE_DE_OPCIONES) {
    return { dibujadas: [...filtradas], hayMasQueElTope: false }
  }
  const primeras = filtradas.slice(0, TOPE_DE_OPCIONES)
  const dibujadas =
    marcada !== null && !primeras.includes(marcada) && filtradas.includes(marcada)
      ? [marcada, ...primeras.slice(0, TOPE_DE_OPCIONES - 1)]
      : primeras
  return { dibujadas, hayMasQueElTope: true }
}
