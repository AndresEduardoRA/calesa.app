import { UserRoundXIcon } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { ZONA_POR_DEFECTO } from '@/shared/lib/fechas'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { EstadoVacio } from '@/shared/ui/estados'
import { bloquesParaMontar } from '../bloques/registro'
import { EsqueletoDeBloque } from './esqueleto-de-bloque'
import { MarcoDeBloque } from './marco-de-bloque'
import { MontajeDeBloque } from './montaje-de-bloque'

type Props = {
  nombre: string
  permisos: Permisos
  // La persona entró pero nadie le asignó un rol todavía.
  sinRol: boolean
  // La zona horaria de la empresa: de ella sale qué es «hoy».
  zona?: string
}

// Inicio: la bandeja de trabajo. No es un tablero de métricas (eso es `/tablero`): es lo que hay
// que hacer ahora, armado con los permisos de quien entra. Cada bloque lee por su cuenta tras su
// `<Suspense>`: uno lento o caído no frena ni tumba a los demás.
export function Bandeja({ nombre, permisos, sinRol, zona = ZONA_POR_DEFECTO }: Props) {
  const bloques = bloquesParaMontar(permisos)

  return (
    <div className="grid gap-5">
      <header className="grid gap-1">
        <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Hola, {nombre}</h1>
        {bloques.length > 0 ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Lo que hay para hacer hoy, según lo que tu rol te permite.
          </p>
        ) : null}
        {puede(permisos, 'tablero.metricas.ver') ? (
          <Link
            href="/tablero"
            className="w-fit text-(length:--text-sm) text-(--color-primario) underline underline-offset-2"
          >
            Ver el tablero
          </Link>
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
          {bloques.map((montaje) => (
            <MarcoDeBloque key={montaje.bloque.clave} bloque={montaje.bloque}>
              <Suspense fallback={<EsqueletoDeBloque />}>
                <MontajeDeBloque montaje={montaje} zona={zona} />
              </Suspense>
            </MarcoDeBloque>
          ))}
        </div>
      )}
    </div>
  )
}
