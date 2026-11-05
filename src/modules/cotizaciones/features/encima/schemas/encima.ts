import { z } from 'zod'

// Lo que manda «Cotizar encima»: la anterior y el intento (el id de la nueva, que la pantalla conserva sólo mientras no sabe si entró). Los ids son de la base (`z.guid()`);
// la base vuelve a comprobar todo con la sesión de quien cotiza.
export const esquemaDeEncima = z.object({ anterior: z.guid(), intento: z.guid() })
