import { UserRoundXIcon } from 'lucide-react'
import type { Permisos } from '@/shared/lib/permisos'
import { EstadoVacio } from '@/shared/ui/estados'
import { bloquesVisibles, type BloqueBandeja } from '../../../entities/bandeja'

type Props = {
  nombre: string
  permisos: Permisos
  // La persona entró pero nadie le asignó un rol todavía.
  sinRol: boolean
}

function Bloque({ bloque }: { bloque: BloqueBandeja }) {
  return (
    <section
      aria-labelledby={`bandeja-${bloque.clave}`}
      className="flex flex-col rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)"
    >
      <h2
        id={`bandeja-${bloque.clave}`}
        className="border-b border-(--color-line) px-4 py-3 text-(length:--text-base) font-medium text-(--color-ink)"
      >
        {bloque.titulo}
      </h2>
      <EstadoVacio compacto titulo="Nada pendiente" descripcion={bloque.vacio} />
    </section>
  )
}

// Inicio: la bandeja de trabajo. No es un tablero de métricas (eso es `/tablero`): es lo que hay
// que hacer ahora, armado con los permisos de quien entra.
export function Bandeja({ nombre, permisos, sinRol }: Props) {
  const bloques = bloquesVisibles(permisos)

  return (
    <div className="grid gap-5">
      <header className="grid gap-1">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Hola, {nombre}</h1>
        {bloques.length > 0 ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Lo que hay para hacer hoy, según lo que tu rol te permite.
          </p>
        ) : null}
      </header>

      {bloques.length === 0 ? (
        <div className="rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
          {sinRol ? (
            <EstadoVacio
              Icono={UserRoundXIcon}
              titulo="Aún no tienes un rol, avisa al dueño"
              descripcion="Tu cuenta ya funciona. En cuanto te asignen un rol vas a ver acá tu trabajo y el menú con tus secciones."
            />
          ) : (
            <EstadoVacio
              titulo="Tu rol todavía no tiene trabajo en la bandeja"
              descripcion="Los permisos de tu rol no incluyen ninguna de las tareas que se muestran acá. Si falta alguno, avisa a quien administra el equipo."
            />
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {bloques.map((bloque) => (
            <Bloque key={bloque.clave} bloque={bloque} />
          ))}
        </div>
      )}
    </div>
  )
}
