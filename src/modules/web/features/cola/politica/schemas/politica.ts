import { z } from 'zod'
import { LIMITES_DE_LA_POLITICA } from '../../../../entities/cola/politica'

function entero({ min, max }: { min: number; max: number }) {
  const error = `Escribe un número entero entre ${min} y ${max}.`
  return z.number({ error }).int({ error }).min(min, { error }).max(max, { error })
}

const { ttlContactoMinutos, diasPegajoso, maxAbiertasDefault, maxIntentos } = LIMITES_DE_LA_POLITICA

// La política de la cola: las cinco claves y la versión que se leyó (un cambio ajeno da `PT409`).
export const esquemaPoliticaDeLaCola = z.object({
  colaActiva: z.boolean(),
  ttlContactoMinutos: entero(ttlContactoMinutos),
  diasPegajoso: entero(diasPegajoso),
  maxAbiertasDefault: entero(maxAbiertasDefault),
  maxIntentos: entero(maxIntentos),
  actualizadoEnEsperado: z.iso.datetime({ offset: true }),
})
