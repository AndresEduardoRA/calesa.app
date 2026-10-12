import { z } from 'zod'
import { codigoDeMoneda } from '../../../entities/regional'

// El `actualizado_en` que tenía en pantalla quien edita: detecta un cambio ajeno.
const version = z.string().min(1)

const nombre = z
  .string()
  .trim()
  .min(2, { error: 'Escribe un nombre.' })
  .max(40, { error: 'El nombre no puede pasar de 40 caracteres.' })

const valor = z
  .number({ error: 'Escribe un valor mayor que cero, con hasta 6 decimales.' })
  .positive({ error: 'Escribe un valor mayor que cero, con hasta 6 decimales.' })

const moneda = z.string().length(3, { error: 'Elige una moneda.' })

export const esquemaCrearTipoCambio = z
  .object({ nombre, monedaDe: moneda, monedaA: moneda, valor })
  .refine((nuevo) => nuevo.monedaDe !== nuevo.monedaA, {
    path: ['monedaA'],
    error: 'Un tipo de cambio va entre dos monedas distintas.',
  })

// Lo que no viaja no se toca. `esDefault` sólo puede venir en `true`: para cambiar el que está
// por defecto se marca otro.
export const esquemaGuardarTipoCambio = z.object({
  // guid y no uuid: `z.uuid()` exige versión y variante RFC, y Postgres acepta cualquier uuid.
  id: z.guid(),
  actualizadoEnEsperado: version,
  nombre: nombre.optional(),
  valor: valor.optional(),
  activo: z.boolean().optional(),
  esDefault: z.literal(true).optional(),
})

const simbolo = z
  .string()
  .trim()
  .min(1, { error: 'Escribe el símbolo, como $ o Bs.' })
  .max(6, { error: 'El símbolo no puede pasar de 6 caracteres.' })

const decimales = z
  .number({ error: 'Escribe cuántos decimales usa, de 0 a 4.' })
  .int({ error: 'Escribe cuántos decimales usa, de 0 a 4.' })
  .min(0, { error: 'Escribe cuántos decimales usa, de 0 a 4.' })
  .max(4, { error: 'Escribe cuántos decimales usa, de 0 a 4.' })

export const esquemaCrearMoneda = z.object({
  // El código tiene que ser uno que `Intl` sepa imprimir: es con lo que se formatean los montos.
  codigo: z.string().transform((texto, contexto) => {
    const codigo = codigoDeMoneda(texto)
    if (!codigo) {
      contexto.issues.push({
        code: 'custom',
        message: 'Ese código no es de una moneda. Usa el de tres letras, como CLP.',
        input: texto,
      })
      return z.NEVER
    }
    return codigo
  }),
  nombre,
  simbolo,
  decimales,
})

export const esquemaGuardarMoneda = z.object({
  codigo: moneda,
  actualizadoEnEsperado: version,
  nombre: nombre.optional(),
  simbolo: simbolo.optional(),
  decimales: decimales.optional(),
  activa: z.boolean().optional(),
})
