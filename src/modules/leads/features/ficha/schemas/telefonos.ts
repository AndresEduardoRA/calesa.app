import { z } from 'zod'

// Lo que cruza el límite de los teléfonos de la ficha: sólo la forma; los motivos (de un número, de
// una etiqueta) los dice la base con su campo en el `hint`.
const codigoDePais = z.string().trim().max(8).nullable()
const telefono = z.string().max(60)

export const esquemaCambiarTelefono = z.object({
  id: z.guid(),
  // La versión del lead que tenía en pantalla quien lo cambia.
  actualizadoEnEsperado: z.string().min(1),
  codigoDePais,
  telefono,
})

export const esquemaVerificarTelefonoDeLead = z.object({
  id: z.guid(),
  codigoDePais,
  telefono,
})

// Agregar, rotular y restituir un extra son lo mismo: se guarda por su id. Un reintento (o un
// «Deshacer») manda el mismo id y no duplica.
export const esquemaGuardarTelefonoExtra = z.object({
  leadId: z.guid(),
  id: z.guid(),
  codigoDePais,
  telefono,
  etiqueta: z.string().trim().max(80).nullable(),
  // Para volver a su lugar en la lista (un «Deshacer»); la base lo acota a ahora.
  creadoEn: z.iso.datetime({ offset: true }).nullable(),
})

export const esquemaQuitarTelefonoExtra = z.object({
  leadId: z.guid(),
  id: z.guid(),
})
