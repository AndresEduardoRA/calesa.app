import { NOMBRE_POR_DEFECTO } from '@/shared/config/app'
import { ConmutadorTema } from '@/shared/ui/conmutador-tema'

// Portada provisoria. La bandeja de inicio por permisos reemplaza esta página.
export default function Inicio() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <section className="w-full max-w-md rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md)">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-semibold text-(--color-ink)">{NOMBRE_POR_DEFECTO}</h1>
          <ConmutadorTema />
        </div>
        <p className="mt-3 text-(--color-ink-soft)">
          El sistema está instalado. El ingreso y las pantallas de trabajo todavía no están
          disponibles.
        </p>
      </section>
    </main>
  )
}
