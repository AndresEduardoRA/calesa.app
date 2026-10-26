// Los tonos de la empresa (`tonos`, paso 4.08: fondo, borde y tinta en claro y en oscuro, con el AA validado en la base) como reglas de CSS.
// La celda no lleva un solo color: pone `data-tono="<clave>"` y lee `--tono-fondo|borde|tinta`. Lo que sale de acá se escribe en un
// `<style>`, así que nada que no sea una clave o un `#rrggbb` validado llega al CSS.
import { z } from 'zod'
import { esHex } from '@/shared/lib/color'

// La clave que arma `_tono_clave()`: letra minúscula, hasta 30 caracteres. Sin comillas en el selector porque no hace falta.
const CLAVE = /^[a-z][a-z0-9_]{1,29}$/

const color = z.string().refine(esHex, { error: 'Tiene que ser un #rrggbb.' })
const colores = z.object({ fondo: color, borde: color, tinta: color })
const tono = z.object({ clave: z.string().regex(CLAVE), claro: colores, oscuro: colores })

export type ColoresDeTono = z.infer<typeof colores>
export type Tono = z.infer<typeof tono>

function variables(c: ColoresDeTono): string {
  return `--tono-fondo:${c.fondo.toLowerCase()};--tono-borde:${c.borde.toLowerCase()};--tono-tinta:${c.tinta.toLowerCase()}`
}

// Un tono con una clave o un color inválidos se descarta entero (la celda cae al neutro), nunca se escribe a medias.
export function cssDeTonos(tonos: readonly unknown[]): string {
  return tonos
    .flatMap((candidato) => {
      const leido = tono.safeParse(candidato)
      return leido.success ? [leido.data] : []
    })
    .map(
      (t) =>
        `[data-tono=${t.clave}]{${variables(t.claro)}}.dark [data-tono=${t.clave}]{${variables(t.oscuro)}}`,
    )
    .join('\n')
}
