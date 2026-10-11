import { Suspense, type ReactNode } from 'react'
import { getAjustes } from '@/modules/empresa'
import { urlPublicaONull } from '@/shared/lib/almacen'
import { ConmutadorTema } from '@/shared/ui/conmutador-tema'
import { Marca } from '@/shared/ui/marca'
import { Skeleton } from '@/shared/ui/skeleton'

async function MarcaDeLaEmpresa() {
  const ajustes = await getAjustes()
  return <Marca nombre={ajustes.nombre} logoUrl={urlPublicaONull('marca', ajustes.logoRuta)} />
}

// Marco de las pantallas de antes de entrar: ingreso, registro, recuperación y contraseña nueva.
// El marco es estático; lo que depende de la empresa o de la URL llega por <Suspense>.
export default function LayoutAcceso({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="absolute top-4 right-4">
        <ConmutadorTema />
      </div>
      <Suspense fallback={<Skeleton className="h-7 w-44" />}>
        <MarcaDeLaEmpresa />
      </Suspense>
      <main className="grid w-full max-w-sm gap-5 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md)">
        {children}
      </main>
    </div>
  )
}
