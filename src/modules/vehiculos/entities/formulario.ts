// El estado del formulario de un vehículo: una entrada por dato común y una por campo activo del
// layout (con el prefijo `a.`). Guarda lo que la persona ve y escribe (texto, sí o no, lista), no
// el dato ya convertido: de eso se ocupa `esquema.ts`, igual en el navegador y en el servidor.
import {
  deAtributo,
  vacioDe,
  type ValorDeFormulario,
  type ValoresDeFormulario,
} from '@/shared/lib/campos'
import { formatearParaEditar } from '@/shared/lib/formato'
import { PREFIJO_DE_ATRIBUTO, type CampoDeVehiculo } from './campo'
import type { CampoComun } from './comunes'
import type { DatosDeSubasta } from './subasta'
import type { Vehiculo } from './vehiculo'

// Lo que guarda el formulario de un vehículo es lo de cualquier formulario de campos: vive en
// `shared/lib/campos`.
export { vacioDe, type ValorDeFormulario, type ValoresDeFormulario }

export const claveDeAtributo = (clave: string) => PREFIJO_DE_ATRIBUTO + clave

// Un número va con el locale de la empresa y sin miles (4.13-3c): el lector de lo tipeado lo lee de vuelta igual.
const comoTexto = (valor: unknown, locale: string) =>
  typeof valor === 'number' ? formatearParaEditar(valor, { locale }) : String(valor)

function deComun(campo: CampoComun, vehiculo: Vehiculo | null, locale: string): ValorDeFormulario {
  const valor = vehiculo?.[campo.clave] ?? null
  if (campo.tipo === 'si_no') {
    return typeof valor === 'boolean' ? valor : null
  }
  return valor === null ? '' : comoTexto(valor, locale)
}

type Fuentes = {
  comunes: readonly CampoComun[]
  // Los campos activos del layout.
  campos: readonly CampoDeVehiculo[]
  // null = un alta: los campos del layout arrancan con su valor por defecto.
  vehiculo: Vehiculo | null
  zona?: string
  // El de la empresa: con él se escriben los números (obligatorio: un llamador que lo olvide no compila).
  locale: string
}

export function valoresIniciales({
  comunes,
  campos,
  vehiculo,
  zona,
  locale,
}: Fuentes): ValoresDeFormulario {
  const valores: ValoresDeFormulario = {}
  for (const campo of comunes) {
    valores[campo.clave] = deComun(campo, vehiculo, locale)
  }
  for (const campo of campos) {
    const guardado = vehiculo ? vehiculo.atributos[campo.clave] : campo.valorDefecto
    valores[claveDeAtributo(campo.clave)] = deAtributo(campo, guardado, zona, locale)
  }
  return valores
}

// Cómo se llama en el formulario cada columna que apibara llena.
const CLAVE_DE_COLUMNA: Record<keyof DatosDeSubasta['columnas'], string> = {
  titulo: 'titulo',
  marca: 'marca',
  modelo: 'modelo',
  anio: 'anio',
  vin: 'vin',
  lote: 'lote',
  plataforma: 'plataforma',
  kilometraje: 'kilometraje',
  url_origen: 'urlOrigen',
}

// Lo que trajo apibara puesto en el formulario, encima de lo que ya había. Sólo toca lo que la
// respuesta trae y lo que el formulario tiene: el resto queda como estaba, editable.
export function conDatosDeSubasta(
  valores: ValoresDeFormulario,
  datos: DatosDeSubasta,
  campos: readonly CampoDeVehiculo[],
  { zona, locale }: { zona?: string | undefined; locale: string },
): ValoresDeFormulario {
  const siguiente: ValoresDeFormulario = { ...valores }
  for (const [columna, valor] of Object.entries(datos.columnas)) {
    const clave = CLAVE_DE_COLUMNA[columna as keyof DatosDeSubasta['columnas']]
    if (clave in siguiente) {
      siguiente[clave] = comoTexto(valor, locale)
    }
  }
  for (const campo of campos) {
    const valor = datos.atributos[campo.clave]
    if (valor !== undefined) {
      siguiente[claveDeAtributo(campo.clave)] = deAtributo(campo, valor, zona, locale)
    }
  }
  return siguiente
}
