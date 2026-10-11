'use client'

import { usePerspectiva } from '@/modules/equipo/client'
import {
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '@/shared/ui/dropdown-menu'

// Alto de un renglón del menú: cómodo para el dedo en móvil, compacto con mouse.
const RENGLON = 'min-h-11 md:min-h-8'
// El valor del renglón «sin perspectiva» (los demás llevan el id de su rol).
const SIN_PERSPECTIVA = 'yo'

// «Ver como» en el menú del usuario: elegir un rol para mirar la app con sus permisos. Sólo lo
// ve quien puede usarla (quien gestiona roles); para el resto no ocupa lugar.
export function VerComo() {
  const { disponible, rol, roles, verComo, salir, enCurso } = usePerspectiva()
  if (!disponible) {
    return null
  }
  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel>Ver como</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={rol?.id ?? SIN_PERSPECTIVA}
          onValueChange={(valor: string) => {
            void (valor === SIN_PERSPECTIVA ? salir() : verComo(valor))
          }}
        >
          <DropdownMenuRadioItem value={SIN_PERSPECTIVA} className={RENGLON} disabled={enCurso}>
            Yo, con mis permisos
          </DropdownMenuRadioItem>
          {roles.map((opcion) => (
            <DropdownMenuRadioItem
              key={opcion.id}
              value={opcion.id}
              className={RENGLON}
              disabled={enCurso}
            >
              {opcion.nombre}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
    </>
  )
}
