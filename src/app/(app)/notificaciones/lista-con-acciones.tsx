'use client'

import { ListaDeNotificaciones } from '@/modules/notificaciones/pantallas/notificaciones'
import { ACCIONES_DE_NOTIFICACIONES } from '../_shell/huecos/acciones-de-notificaciones'

type Props = Omit<Parameters<typeof ListaDeNotificaciones>[0], 'acciones'>

// Une la lista del módulo con el registro de acciones por tipo: una función no cruza de servidor a cliente, por eso
// el registro lo importa un archivo de cliente de `app/` (el mismo que usa la campana del marco).
export function ListaConAcciones(props: Props) {
  return <ListaDeNotificaciones {...props} acciones={ACCIONES_DE_NOTIFICACIONES} />
}
