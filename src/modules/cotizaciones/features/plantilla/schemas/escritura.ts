import { z } from 'zod'
import { esquemaDeNotaDePlantilla } from '../../../entities/plantilla/escritura-de-la-plantilla'

// La versión esperada es el texto que dio la base (`actualizado_en` del borrador con sus microsegundos y su zona): se acepta tal cual, con cualquier cantidad de
// decimales, y nunca pasa por un `Date`.
const esquemaDeLaEsperada = z.iso.datetime({ offset: true })

// Lo que manda «Guardar»: el borrador que se leyó (nula sólo para crear el primero) y la plantilla. Su forma la juzga la base; lo que no es un JSON que la base lee lo ataja
// la action antes (`revisarTextoParaLaBase()`).
export const esquemaDeGuardar = z.object({
  origenId: z.guid(),
  esperada: esquemaDeLaEsperada.nullable(),
  definicion: z.unknown(),
})

// Lo que manda «Publicar»: el borrador que se leyó, siempre, y la nota.
export const esquemaDePublicar = z.object({
  origenId: z.guid(),
  esperada: esquemaDeLaEsperada,
  nota: esquemaDeNotaDePlantilla,
})

// Lo que manda «Descartar borrador»: el borrador que se leyó, siempre.
export const esquemaDeDescartar = z.object({
  origenId: z.guid(),
  esperada: esquemaDeLaEsperada,
})
