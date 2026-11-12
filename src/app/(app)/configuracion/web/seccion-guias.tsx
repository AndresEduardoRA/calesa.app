import { connection } from 'next/server'
import { leerCategorias, leerGuias } from '@/modules/web'
import { PestanaDeGuias } from '@/modules/web/pantallas/sitio-guias'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Guías» (8.03-1) y sus categorías (8.03-2, en paralelo). La lista se lee aquí; `ahora` se toma después de la consulta (el estado de una guía depende de la hora). Si no se
// puede leer, el `error.tsx` con «Reintentar» (nunca una lista vacía). La búsqueda viene de `?q=`.
export async function SeccionGuias({ buscar }: { buscar: string | null }) {
  await connection()
  const [guias, categorias] = await Promise.all([leerGuias({ buscar }), leerCategorias()])
  const { filas, hayMas } = datosO(guias)
  return (
    <PestanaDeGuias
      filas={filas}
      hayMas={hayMas}
      buscar={buscar}
      ahora={new Date().toISOString()}
      categorias={datosO(categorias)}
    />
  )
}
