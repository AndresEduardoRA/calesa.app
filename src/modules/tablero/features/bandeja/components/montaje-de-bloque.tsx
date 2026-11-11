import { connection } from 'next/server'
import type { BloqueParaMontar } from '../bloques/registro'

// Lee la sesión y la base: por eso va tras `connection()` y dentro del `<Suspense>` de su bloque.
export async function MontajeDeBloque({
  montaje: { bloque, cuerpo: Cuerpo },
  zona,
}: {
  montaje: BloqueParaMontar
  zona: string
}) {
  await connection()
  return <Cuerpo bloque={bloque} zona={zona} />
}
