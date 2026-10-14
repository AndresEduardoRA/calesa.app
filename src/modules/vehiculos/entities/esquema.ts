// El esquema Zod de un vehículo, armado desde los datos comunes y el layout de su origen. Es la
// misma función en el formulario (para avisar antes de enviar) y en la Server Action (que vuelve a
// leer el layout): las dos validan igual. La RPC y el trigger son la última línea.
import { z } from 'zod'
import {
  LARGO_DE_TEXTO,
  NUMERO_MAXIMO,
  enlace,
  esquemaDeValor,
  motivosPorCampo,
  numero,
  requerir,
  siONo,
  texto,
  unaDe,
  vin,
  type Dato,
  type Esquema,
} from '@/shared/lib/campos'
import type { Atributos } from './vehiculo'
import type { CampoDeVehiculo, CategoriaDeVehiculo } from './campo'
import type { CampoComun, ClaveComun } from './comunes'
import { claveDeAtributo, vacioDe, type ValoresDeFormulario } from './formulario'

// Lo que viaja a la base: un nulo vacía el dato.
export type DatosDeVehiculo = {
  comunes: Partial<Record<ClaveComun, string | number | boolean | null>>
  atributos: Record<string, Dato>
}

export type Fuentes = {
  comunes: readonly CampoComun[]
  // Los campos activos del layout.
  campos: readonly CampoDeVehiculo[]
  categorias: readonly CategoriaDeVehiculo[]
  // Al editar: lo ya guardado. Una opción que se sacó del campo, o una categoría desactivada,
  // siguen valiendo mientras el vehículo las tenga (el dato se conserva).
  actuales?: { atributos: Atributos; categoriaId: string | null }
  zona?: string
}

// Las categorías activas del origen, más la que el vehículo ya tiene.
function categoria(fuentes: Fuentes): Esquema {
  const activas = fuentes.categorias.filter((una) => una.activa).map((una) => una.id)
  const actual = fuentes.actuales?.categoriaId
  return unaDe(new Set(actual ? [...activas, actual] : activas))
}

const ESQUEMA_COMUN: Record<CampoComun['tipo'], (campo: CampoComun, fuentes: Fuentes) => Esquema> =
  {
    texto: (campo) => texto(campo.largo ?? LARGO_DE_TEXTO),
    entero: (campo) => numero(campo.minimo ?? 0, campo.maximo ?? NUMERO_MAXIMO, true),
    monto: (campo) => numero(campo.minimo ?? 0, campo.maximo ?? NUMERO_MAXIMO, false),
    si_no: siONo,
    vin,
    enlace,
    categoria: (_campo, fuentes) => categoria(fuentes),
  }

// Un `z.object` con una entrada por dato común y una por campo activo del layout (`a.<clave>`).
export function esquemaDeVehiculo(fuentes: Fuentes) {
  const forma: Record<string, Esquema> = {}
  for (const campo of fuentes.comunes) {
    const esquema = ESQUEMA_COMUN[campo.tipo](campo, fuentes)
    forma[campo.clave] = campo.requerido ? requerir(esquema) : esquema
  }
  for (const campo of fuentes.campos) {
    const esquema = esquemaDeValor(campo, {
      zona: fuentes.zona,
      guardado: fuentes.actuales?.atributos[campo.clave],
    })
    forma[claveDeAtributo(campo.clave)] = campo.requerido ? requerir(esquema) : esquema
  }
  return z.object(forma)
}

export type Validacion =
  | { ok: true; datos: DatosDeVehiculo }
  // El primer motivo de cada campo que no pasó, por su clave en el formulario.
  | { ok: false; porCampo: Record<string, string> }

// Un campo que no vino (el layout sumó uno mientras el formulario estaba abierto) cuenta como vacío.
function completar(fuentes: Fuentes, valores: ValoresDeFormulario): ValoresDeFormulario {
  const completos: ValoresDeFormulario = {}
  for (const campo of fuentes.comunes) {
    completos[campo.clave] = valores[campo.clave] ?? (campo.tipo === 'si_no' ? null : '')
  }
  for (const campo of fuentes.campos) {
    const clave = claveDeAtributo(campo.clave)
    completos[clave] = valores[clave] ?? vacioDe(campo)
  }
  return completos
}

// Valida lo que hay en el formulario y lo deja listo para la base.
export function validarVehiculo(fuentes: Fuentes, valores: ValoresDeFormulario): Validacion {
  const resultado = esquemaDeVehiculo(fuentes).safeParse(completar(fuentes, valores))
  if (!resultado.success) {
    return { ok: false, porCampo: motivosPorCampo(resultado.error.issues) }
  }
  const datos: DatosDeVehiculo = { comunes: {}, atributos: {} }
  for (const campo of fuentes.comunes) {
    const valor = resultado.data[campo.clave] ?? null
    // Ningún dato común es una lista.
    datos.comunes[campo.clave] = Array.isArray(valor) ? null : valor
  }
  for (const campo of fuentes.campos) {
    datos.atributos[campo.clave] = resultado.data[claveDeAtributo(campo.clave)] ?? null
  }
  return { ok: true, datos }
}
