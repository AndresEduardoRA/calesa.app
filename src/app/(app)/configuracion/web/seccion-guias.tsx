import { connection } from 'next/server'
import { leerGuias } from '@/modules/web'
import { PestanaDeGuias } from '@/modules/web/pantallas/sitio-guias'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Guías» (8.03-1). La lista se lee aquí; `ahora` se toma después de la consulta (el estado de una guía depende de la hora). Si no se
// puede leer, el `error.tsx` con «Reintentar» (nunca una lista vacía). La búsqueda viene de `?q=`.
export async function SeccionGuias({ buscar }: { buscar: string | null }) {
  await connection()
  const { filas, hayMas } = datosO(await leerGuias({ buscar }))
  return (
    <PestanaDeGuias
      filas={filas}
      hayMas={hayMas}
      buscar={buscar}
      ahora={new Date().toISOString()}
    />
  )
}
