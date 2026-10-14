// Las piezas Zod de un campo configurable, iguales en todo módulo: cada uno arma con ellas sus
// esquemas de crear y guardar y suma lo suyo (el contenedor, sus banderas).
import { z } from 'zod'
import {
  LARGO_MAXIMO_DE_VALOR_DEFECTO,
  admiteValorDefecto,
  valorDefectoPara,
} from './valor-defecto'
import { tieneOpciones, type OpcionDeCampo, type TipoDeCampo, type ValorDefecto } from './tipos'

export const esquemaVersion = z.string().min(1)

export const esquemaEtiqueta = z
  .string()
  .trim()
  .min(2, { error: 'Escribe un nombre.' })
  .max(60, { error: 'El nombre no puede pasar de 60 caracteres.' })

// `mensajeReservada` dice por qué esa clave no sirve («ya es un dato común de todos los vehículos»).
export function esquemaClave(reservadas: readonly string[], mensajeReservada: string) {
  return z
    .string()
    .regex(/^[a-z][a-z0-9_]{1,40}$/, {
      error: 'La clave usa minúsculas, números y guion bajo, y empieza con una letra.',
    })
    .refine((valor) => !reservadas.includes(valor), { error: mensajeReservada })
}

const opcion = z.object({
  clave: z
    .string()
    .regex(/^[a-z0-9][a-z0-9_]{0,40}$/, { error: 'La clave de la opción no es válida.' }),
  etiqueta: z.string().trim().min(1, { error: 'Cada opción necesita un nombre.' }).max(60),
})

export const esquemaOpciones = z
  .array(opcion)
  .max(60, { error: 'Hasta 60 opciones.' })
  .refine((lista) => new Set(lista.map((o) => o.clave)).size === lista.length, {
    error: 'Hay dos opciones con el mismo nombre.',
  })

export const esquemaGrupo = z
  .string()
  .trim()
  .max(40, { error: 'El grupo no puede pasar de 40 caracteres.' })
  .transform((valor) => (valor === '' ? null : valor))
  .nullable()

// Su forma depende del tipo y de las opciones: acá sólo se acota; `valorDefectoPara()` decide.
export const esquemaValorDefecto = z
  .union([
    z.string().max(LARGO_MAXIMO_DE_VALOR_DEFECTO, {
      error: `Hasta ${String(LARGO_MAXIMO_DE_VALOR_DEFECTO)} caracteres.`,
    }),
    z.number(),
    z.boolean(),
    z.array(z.string()).max(60),
  ])
  .nullable()

// Un texto opcional de hasta `largo`: vacío es «sin valor».
export function esquemaTextoOpcional(largo: number) {
  return z
    .string()
    .trim()
    .max(largo, { error: `No puede pasar de ${String(largo)} caracteres.` })
    .transform((valor) => (valor === '' ? null : valor))
    .nullable()
}

type DatosDeCampo = {
  tipo: TipoDeCampo
  opciones: OpcionDeCampo[]
  valorDefecto: ValorDefecto | null
}

// Lo que no se puede decir campo por campo: un tipo con opciones las necesita, uno sin ellas no las
// lleva, y el valor por defecto tiene que servir para ese tipo.
export function conReglasDeCampo<Esquema extends z.ZodType<DatosDeCampo>>(esquema: Esquema) {
  return esquema
    .refine((campo) => !tieneOpciones(campo.tipo) || campo.opciones.length > 0, {
      path: ['opciones'],
      error: 'Un campo de opciones necesita al menos una.',
    })
    .refine((campo) => tieneOpciones(campo.tipo) || campo.opciones.length === 0, {
      path: ['opciones'],
      error: 'Sólo un campo de opciones lleva opciones.',
    })
    .refine(
      (campo) =>
        campo.valorDefecto === null ||
        (admiteValorDefecto(campo.tipo) &&
          valorDefectoPara(campo.tipo, campo.opciones, campo.valorDefecto) !== null),
      { path: ['valorDefecto'], error: 'Ese valor por defecto no sirve para este tipo de campo.' },
    )
}
