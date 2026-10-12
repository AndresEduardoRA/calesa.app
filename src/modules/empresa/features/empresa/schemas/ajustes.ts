import { z } from 'zod'
import { RETENCION_MAXIMA_DIAS, RETENCION_MINIMA_DIAS } from '../../../entities/ajustes-empresa'
import { RUTA_DE_LOGO, validarColorDeMarca } from '../../../entities/marca'
import { localeCanonico, zonaHorariaValida } from '../../../entities/regional'

// Un dato que puede quedar vacío: el campo en blanco se guarda como «sin dato».
function opcional(largoMaximo: number) {
  return z
    .string()
    .trim()
    .max(largoMaximo, { error: `No puede pasar de ${largoMaximo} caracteres.` })
    .transform((valor) => (valor === '' ? null : valor))
}

const dias = z
  .number({ error: 'Escribe un número de días.' })
  .int({ error: 'Escribe un número de días, sin decimales.' })
  .min(RETENCION_MINIMA_DIAS, { error: 'Como mínimo, 1 día.' })
  .max(RETENCION_MAXIMA_DIAS, { error: 'Como máximo, 365 días.' })

export const esquemaAjustes = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, { error: 'Escribe el nombre de la empresa.' })
    .max(80, { error: 'El nombre no puede pasar de 80 caracteres.' }),
  // Vacío = sin color propio: valen los colores neutros. Un color sin contraste se rechaza con
  // el motivo que arma `validarColorDeMarca()`.
  colorAcento: z
    .string()
    .trim()
    .transform((valor, contexto) => {
      if (valor === '') {
        return null
      }
      const color = validarColorDeMarca(valor)
      if (!color.ok) {
        contexto.issues.push({ code: 'custom', message: color.motivo, input: valor })
        return z.NEVER
      }
      return color.color
    }),
  // Sin la clave = no tocar el logo; null = quitarlo; una ruta = el que se acaba de subir.
  logoRuta: z.string().regex(RUTA_DE_LOGO, { error: 'El logo no se subió bien.' }).nullish(),
  razonSocial: opcional(160),
  nit: opcional(40),
  direccion: opcional(200),
  ciudad: opcional(80),
  telefono: opcional(40),
  whatsapp: opcional(40),
  email: z
    .union([z.literal(''), z.email({ error: 'Ese correo no parece válido.' })])
    .transform((valor) => (valor === '' ? null : valor)),
  pais: z
    .string()
    .trim()
    .min(2, { error: 'Escribe el país.' })
    .max(80, { error: 'El país no puede pasar de 80 caracteres.' }),
  locale: z.string().transform((valor, contexto) => {
    const canonico = localeCanonico(valor)
    if (!canonico) {
      contexto.issues.push({
        code: 'custom',
        message: 'Ese formato regional no existe. Prueba con uno como es-BO.',
        input: valor,
      })
      return z.NEVER
    }
    return canonico
  }),
  zonaHoraria: z.string().trim().refine(zonaHorariaValida, {
    error: 'Esa zona horaria no existe. Elige una de la lista, como America/La_Paz.',
  }),
  // No viaja cuando hay datos cargados: el campo está deshabilitado y la base la rechazaría.
  monedaBase: z.string().length(3, { error: 'Elige la moneda base.' }).optional(),
  registroAbierto: z.boolean(),
  papeleraDias: dias,
  actividadDias: dias,
  // El `actualizado_en` con el que se abrió el formulario: detecta un cambio ajeno.
  actualizadoEnEsperado: z.string().min(1),
})

export type EntradaDeAjustes = z.input<typeof esquemaAjustes>
