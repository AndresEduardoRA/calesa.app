import { z } from 'zod'
import { REDES_DEL_SITIO } from '../../../../entities/sitio/ajustes'

// Lo mismo que `_web_ajustes_validar` (la base es el candado), con sus mensajes palabra por palabra. Un texto vacío vale: vacía el campo.
const hasta = (maximo: number, mensaje: string) => z.string().trim().max(maximo, { error: mensaje })
const HTTPS = /^https:\/\/\S+$/

const red = (nombre: string) =>
  z
    .string()
    .trim()
    .refine((valor) => valor === '' || (HTTPS.test(valor) && valor.length <= 500), {
      error: `La dirección de «${nombre}» empieza con https://.`,
    })

export const esquemaAjustesDelSitio = z.object({
  nombreSitio: hasta(80, 'El nombre del sitio lleva hasta 80 caracteres.'),
  lema: hasta(160, 'El lema lleva hasta 160 caracteres.'),
  horario: hasta(200, 'El horario lleva hasta 200 caracteres.'),
  direccionPublica: hasta(500, 'La dirección pública lleva hasta 500 caracteres.').refine(
    (valor) => valor === '' || HTTPS.test(valor),
    { error: 'La dirección pública empieza con https://.' },
  ),
  whatsappRespaldo: z
    .string()
    .trim()
    .refine((valor) => valor === '' || /^\+[1-9][0-9]{6,14}$/.test(valor), {
      error: 'El WhatsApp va con el código de país, por ejemplo +59170000000.',
    }),
  ...(Object.fromEntries(REDES_DEL_SITIO.map((nombre) => [nombre, red(nombre)])) as Record<
    (typeof REDES_DEL_SITIO)[number],
    ReturnType<typeof red>
  >),
  seoTitulo: hasta(70, 'El título para buscadores lleva hasta 70 caracteres.'),
  seoDescripcion: hasta(160, 'La descripción para buscadores lleva hasta 160 caracteres.'),
  mostrarMonedaSecundaria: z.boolean(),
  origenesVisibles: z.array(z.guid()).max(200),
  actualizadoEnEsperado: z.string().min(1),
})

export type EntradaDeAjustesDelSitio = z.infer<typeof esquemaAjustesDelSitio>
