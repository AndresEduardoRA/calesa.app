import { z } from 'zod'
import { rutaDeImagenSegura } from '../../../../entities/contenido/doc'
import {
  MAXIMO_DEL_RESUMEN_DE_GUIA,
  MAXIMO_DEL_SEO_DESCRIPCION,
  MAXIMO_DEL_SEO_TITULO,
  MAXIMO_DEL_SLUG_DE_GUIA,
  MAXIMO_DEL_TITULO_DE_GUIA,
  esSlugValido,
} from '../../../../entities/contenido/guias'

// Lo mismo que pide la base y más: lo que se escribe en la pantalla, con sus mensajes. Un texto vacío vale en los opcionales (queda nulo).
const opcional = (maximo: number, mensaje: string) =>
  z
    .string()
    .trim()
    .max(maximo, { error: mensaje })
    .transform((valor) => (valor === '' ? null : valor))

const titulo = z
  .string()
  .trim()
  .min(1, { error: 'Escribe el título de la guía.' })
  .max(MAXIMO_DEL_TITULO_DE_GUIA, {
    error: `El título lleva hasta ${String(MAXIMO_DEL_TITULO_DE_GUIA)} caracteres.`,
  })

const slug = z
  .string()
  .trim()
  .min(1, { error: 'Escribe la dirección de la guía.' })
  .max(MAXIMO_DEL_SLUG_DE_GUIA, {
    error: `La dirección lleva hasta ${String(MAXIMO_DEL_SLUG_DE_GUIA)} caracteres.`,
  })
  .refine(esSlugValido, {
    error: 'La dirección usa minúsculas, números y guiones, por ejemplo como-importar-un-auto.',
  })

// La portada es una ruta del bucket `web`, de la carpeta de las guías.
const portada = z
  .string()
  .nullable()
  .refine(
    (ruta) => ruta === null || (rutaDeImagenSegura(ruta) !== null && ruta.startsWith('guias/')),
    {
      error: 'Esa portada no se admite: súbela desde la guía.',
    },
  )

export const esquemaCrearGuia = z.object({ titulo, slug })

export const esquemaGuardarGuia = z.object({
  id: z.guid(),
  actualizadoEnEsperado: z.string().min(1),
  titulo,
  slug,
  resumen: opcional(
    MAXIMO_DEL_RESUMEN_DE_GUIA,
    `El resumen lleva hasta ${String(MAXIMO_DEL_RESUMEN_DE_GUIA)} caracteres.`,
  ),
  categoriaId: z.guid().nullable(),
  autorId: z.guid().nullable(),
  portadaRuta: portada,
  seoTitulo: opcional(
    MAXIMO_DEL_SEO_TITULO,
    `El título para buscadores lleva hasta ${String(MAXIMO_DEL_SEO_TITULO)} caracteres.`,
  ),
  seoDescripcion: opcional(
    MAXIMO_DEL_SEO_DESCRIPCION,
    `La descripción para buscadores lleva hasta ${String(MAXIMO_DEL_SEO_DESCRIPCION)} caracteres.`,
  ),
  // El documento llega como lo emite el editor; la action lo reduce a la lista blanca y la base lo vuelve a validar.
  cuerpoDoc: z.unknown(),
  publicacion: z.discriminatedUnion('tipo', [
    z.object({ tipo: z.literal('mantener') }),
    z.object({ tipo: z.literal('publicar') }),
    z.object({ tipo: z.literal('programar'), cuando: z.iso.datetime({ offset: true }) }),
    z.object({ tipo: z.literal('despublicar') }),
  ]),
})

export const esquemaEliminarGuia = z.object({
  id: z.guid(),
  actualizadoEnEsperado: z.string().min(1),
})
