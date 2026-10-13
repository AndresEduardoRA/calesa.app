// El esquema Zod de un vehículo, armado desde los datos comunes y el layout de su origen. Es la
// misma función en el formulario (para avisar antes de enviar) y en la Server Action (que vuelve a
// leer el layout): las dos validan igual. La RPC y el trigger son la última línea.
import { z } from 'zod'
import { instanteDeLocal } from '@/shared/lib/fechas'
import type { Atributos } from './vehiculo'
import type { CampoDeVehiculo, CategoriaDeVehiculo, TipoDeCampo } from './campo'
import type { CampoComun, ClaveComun } from './comunes'
import { claveDeAtributo, vacioDe, type ValoresDeFormulario } from './formulario'

type Dato = string | number | boolean | string[] | null

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

const OBLIGATORIO = 'Este dato es obligatorio.'
const VIN = /^[A-HJ-NPR-Z0-9]{11,17}$/
const FECHA = /^\d{4}-\d{2}-\d{2}$/
const LARGO_DE_TEXTO = 500
const LARGO_DE_TEXTO_LARGO = 5000
const NUMERO_MAXIMO = 1_000_000_000_000

const vacioANulo = (texto: string) => (texto === '' ? null : texto)

function texto(largo: number) {
  return z
    .string()
    .trim()
    .max(largo, { error: `Hasta ${String(largo)} caracteres.` })
    .transform(vacioANulo)
}

// Acepta la coma decimal: «1,6» es 1.6.
const aNumero = (escrito: string) => (escrito === '' ? null : Number(escrito.replace(',', '.')))

function numero(minimo: number, maximo: number, entero: boolean) {
  const mensaje = entero
    ? `Tiene que ser un número entero entre ${String(minimo)} y ${String(maximo)}.`
    : 'Tiene que ser un número.'
  return z
    .string()
    .trim()
    .transform(aNumero)
    .refine(
      (valor) =>
        valor === null ||
        (Number.isFinite(valor) &&
          valor >= minimo &&
          valor <= maximo &&
          (!entero || Number.isInteger(valor))),
      { error: mensaje },
    )
}

const siONo = () => z.boolean().nullable()

const vin = () =>
  z
    .string()
    .trim()
    .transform((escrito) => vacioANulo(escrito.toUpperCase()))
    .refine((valor) => valor === null || VIN.test(valor), {
      error: 'El VIN lleva entre 11 y 17 letras y números, sin I, O ni Q.',
    })

const enlace = () =>
  texto(LARGO_DE_TEXTO).refine((valor) => valor === null || /^https?:\/\/\S+$/i.test(valor), {
    error: 'Tiene que empezar con http:// o https://.',
  })

const esDia = (dia: string) => {
  const instante = new Date(`${dia}T00:00:00Z`)
  return (
    FECHA.test(dia) && !Number.isNaN(instante.getTime()) && instante.toISOString().startsWith(dia)
  )
}

const fecha = () =>
  z
    .string()
    .trim()
    .transform(vacioANulo)
    .refine((valor) => valor === null || esDia(valor), { error: 'No es una fecha válida.' })

// La hora que se escribe es la de la empresa; se guarda el instante en UTC.
function fechaHora(zona: string | undefined) {
  return z
    .string()
    .trim()
    .transform((escrito) => (escrito === '' ? null : (instanteDeLocal(escrito, { zona }) ?? '')))
    .refine((valor) => valor !== '', { error: 'No es una fecha y hora válida.' })
}

function unaDe(validas: ReadonlySet<string>) {
  return z
    .string()
    .transform(vacioANulo)
    .refine((valor) => valor === null || validas.has(valor), {
      error: 'Elige una de las opciones.',
    })
}

function variasDe(validas: ReadonlySet<string>) {
  return z
    .array(z.string())
    .transform((elegidas) => [...new Set(elegidas)])
    .refine((elegidas) => elegidas.every((una) => validas.has(una)), {
      error: 'Hay una opción que ya no existe.',
    })
    .transform((elegidas) => (elegidas.length === 0 ? null : elegidas))
}

type Esquema = z.ZodType<Dato, unknown>

function requerir(esquema: Esquema): Esquema {
  return esquema.refine((valor) => valor !== null, { error: OBLIGATORIO })
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

// Las opciones que valen para un campo: las de hoy, más las que el vehículo ya tiene guardadas.
function opcionesValidas(campo: CampoDeVehiculo, fuentes: Fuentes): Set<string> {
  const guardado = fuentes.actuales?.atributos[campo.clave]
  const guardadas = Array.isArray(guardado) ? guardado : [guardado]
  return new Set([
    ...campo.opciones.map((opcion) => opcion.clave),
    ...guardadas.filter((una): una is string => typeof una === 'string'),
  ])
}

const ESQUEMA_POR_TIPO: Record<TipoDeCampo, (campo: CampoDeVehiculo, fuentes: Fuentes) => Esquema> =
  {
    texto: () => texto(LARGO_DE_TEXTO),
    texto_largo: () => texto(LARGO_DE_TEXTO_LARGO),
    lote: () => texto(LARGO_DE_TEXTO),
    numero: () => numero(-NUMERO_MAXIMO, NUMERO_MAXIMO, false),
    moneda: () => numero(-NUMERO_MAXIMO, NUMERO_MAXIMO, false),
    booleano: siONo,
    fecha,
    fecha_hora: (_campo, fuentes) => fechaHora(fuentes.zona),
    url: enlace,
    vin,
    opcion: (campo, fuentes) => unaDe(opcionesValidas(campo, fuentes)),
    multi_opcion: (campo, fuentes) => variasDe(opcionesValidas(campo, fuentes)),
  }

// Un `z.object` con una entrada por dato común y una por campo activo del layout (`a.<clave>`).
export function esquemaDeVehiculo(fuentes: Fuentes) {
  const forma: Record<string, Esquema> = {}
  for (const campo of fuentes.comunes) {
    const esquema = ESQUEMA_COMUN[campo.tipo](campo, fuentes)
    forma[campo.clave] = campo.requerido ? requerir(esquema) : esquema
  }
  for (const campo of fuentes.campos) {
    const esquema = ESQUEMA_POR_TIPO[campo.tipo](campo, fuentes)
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

function motivosPorCampo(problemas: readonly z.core.$ZodIssue[]): Record<string, string> {
  const porCampo: Record<string, string> = {}
  for (const problema of problemas) {
    porCampo[String(problema.path[0])] ??= problema.message
  }
  return porCampo
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
