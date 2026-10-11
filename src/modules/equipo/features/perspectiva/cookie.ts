import 'server-only'
import { cookies } from 'next/headers'
import { COOKIE_PERSPECTIVA } from '../../entities/perspectiva'

// La perspectiva «ver como» viaja en una cookie con el id del rol. Es de sesión (se va al cerrar
// el navegador) y de este dispositivo: mirar como otro rol no es una preferencia que se guarde.
// `httpOnly`: la lee el servidor en cada request (`infra/queries/sesion.ts`), el navegador no la
// necesita. No va firmada porque no otorga nada: la base cruza el rol con los permisos reales.
export async function guardarPerspectiva(rolId: string): Promise<void> {
  const almacen = await cookies()
  almacen.set(COOKIE_PERSPECTIVA, rolId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}

export async function borrarPerspectiva(): Promise<void> {
  const almacen = await cookies()
  almacen.delete(COOKIE_PERSPECTIVA)
}
