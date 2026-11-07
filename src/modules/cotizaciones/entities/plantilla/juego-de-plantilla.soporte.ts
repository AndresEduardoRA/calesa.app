// El juego común de `validar_plantilla()` (`casos-de-plantilla.json`), leído con Zod para las pruebas de TS (4.19-2). Sólo lo importan los `.test.ts`, que
// leen el archivo y le pasan el texto: aquí no hay I/O (el sufijo `.soporte.` lo deja fuera del mapa).
import { z } from 'zod'
import { REGLAS_DE_PLANTILLA } from './motivos-de-plantilla'

// Lo que el validador lee de la fórmula; lo demás pasa sin mirar.
const esquemaDefinicion = z.looseObject({
  nodos: z.array(
    z.looseObject({ id: z.string(), grupo: z.string().nullish(), salida: z.string().nullish() }),
  ),
  buckets: z.record(z.string(), z.string()).optional(),
  grupos: z.array(z.looseObject({ id: z.string(), bucket: z.string().nullish() })).optional(),
})
const esquemaDiseno = z.looseObject({
  cabecera: z
    .looseObject({
      modos: z.array(
        z.looseObject({
          buckets: z.array(z.looseObject({ bucket: z.string(), nodo: z.string() })),
        }),
      ),
    })
    .optional(),
  tarjeta_total: z.looseObject({ secundarios: z.array(z.string()) }).optional(),
})
const esquemaVisibilidad = z.record(z.string(), z.unknown())

// `plantilla` va como `z.unknown()`: un objeto de Zod la rearmaría asignando sus claves, y `__proto__` se perdería.
const comun = {
  nombre: z.string().min(1),
  formula: z.string(),
  plantilla: z.unknown(),
  visibilidad: esquemaVisibilidad.optional(),
}
const esquemaCaso = z.union([
  z.strictObject({ ...comun, valida: z.literal(true) }),
  z.strictObject({
    ...comun,
    motivo: z.strictObject({ regla: z.enum(REGLAS_DE_PLANTILLA), donde: z.string() }),
  }),
])

const esquemaJuego = z.strictObject({
  _nota: z.string(),
  tonos: z.array(z.string()),
  formulas: z.record(
    z.string(),
    z.strictObject({
      definicion: esquemaDefinicion,
      diseno: esquemaDiseno,
      visibilidad: esquemaVisibilidad,
    }),
  ),
  casos: z.array(esquemaCaso).min(1),
  // Una lista vacía no probaría nada: el tope de 32 KB quedaría sin contraste con la base.
  octetos: z.array(z.strictObject({ valor: z.unknown(), bytes: z.int().positive() })).min(1),
})

export type JuegoDePlantilla = z.infer<typeof esquemaJuego>
export type CasoDePlantilla = z.infer<typeof esquemaCaso>

// La ruta del juego, en una variable para el `new URL` de los tests (Vite reescribe uno literal).
export const RUTA_DEL_JUEGO = './casos-de-plantilla.json'

export const juegoDePlantilla = (texto: string): JuegoDePlantilla =>
  esquemaJuego.parse(JSON.parse(texto))
