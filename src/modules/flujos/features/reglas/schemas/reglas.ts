import { z } from 'zod'
import { CLAVES_DE_REGLAS } from '../../../entities/reglas/catalogo'
import { TOPE_DE_LA_OFERTA } from '../../../entities/reglas/oferta'

// Lo que cruza el límite: la forma y la lista cerrada de reglas. Lo que vale cada dato (un puerto que ya no existe, la regla fuera del ámbito) lo dice la base.
const version = z.string().min(1)
const flujoId = z.guid()
const ids = z.array(z.guid()).max(TOPE_DE_LA_OFERTA)

export const esquemaCambiarRegla = z.object({
  flujoId,
  actualizadoEnEsperado: version,
  regla: z.enum(CLAVES_DE_REGLAS),
  activa: z.boolean(),
})

export const esquemaGuardarOferta = z.object({
  flujoId,
  actualizadoEnEsperado: version,
  puertosOrigen: ids,
  puertosDestino: ids,
  navieras: ids,
})
