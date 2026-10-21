'use client'

import type { Permisos } from '@/shared/lib/permisos'
import {
  concesionesDelPermiso,
  type GrupoDePermisos,
  type OrigenDeLaMatriz,
} from '../../../entities/matriz'
import type { CambioDeConcesion } from '../hooks/use-matriz'
import { CeldaConcesion } from './celda-concesion'
import { EncabezadoRol } from './encabezado-rol'
import type { ColumnaDeRol } from './grupo-matriz'

type Props = {
  grupos: readonly GrupoDePermisos[]
  // El rol a la vista: en el celular la matriz se lee de a un rol (`?rol=`).
  columna: ColumnaDeRol
  origenes: readonly OrigenDeLaMatriz[]
  misPermisos: Permisos
  puedeGestionar: boolean
  dominado: boolean
  alEliminar: () => void
  alAplicar: (cambio: CambioDeConcesion) => void
}

// La matriz en el celular: un rol a la vez, y cada permiso es una fila con su nombre y su explicación y, debajo, el control del rol. Una
// tabla de dos columnas con textos y un interruptor pide más que los 412 px del celular con el texto al 200 % y deja el interruptor
// fuera de la vista (reflujo, WCAG 1.4.10; 5a-16): apilando, nada se desplaza de costado. Desde 768 px es la tabla (`MatrizDeRoles`).
export function ListaDelRol(props: Props) {
  const { grupos, columna, origenes, misPermisos, puedeGestionar, dominado } = props
  const { rol, editable, ocupado } = columna
  return (
    <div className="grid grid-cols-[minmax(0,1fr)]">
      <div className="min-w-0 border-b border-(--color-line) p-4">
        <EncabezadoRol
          rol={rol}
          puedeGestionar={puedeGestionar}
          dominado={dominado}
          alEliminar={props.alEliminar}
        />
      </div>
      {grupos.map((grupo) => (
        <section key={grupo.modulo} aria-label={grupo.titulo} className="min-w-0">
          <h2 className="bg-(--color-paper-dim) px-4 py-2 text-(length:--text-xs) font-semibold tracking-wide text-(--color-ink-soft)">
            {grupo.titulo}
          </h2>
          <ul className="grid grid-cols-[minmax(0,1fr)]">
            {grupo.permisos.map((permiso) => (
              <li
                key={permiso.clave}
                data-permiso={permiso.clave}
                className="grid min-w-0 grid-cols-[minmax(0,1fr)] justify-items-start gap-2 border-t border-(--color-line) px-4 py-3"
              >
                <div className="min-w-0">
                  <span
                    data-nombre-de-permiso
                    className="block text-(length:--text-sm) text-(--color-ink)"
                  >
                    {permiso.nombre}
                  </span>
                  <span className="block text-(length:--text-xs) text-(--color-ink-faint)">
                    {permiso.descripcion}
                  </span>
                </div>
                <CeldaConcesion
                  permiso={permiso}
                  rolNombre={rol.nombre}
                  delPermiso={concesionesDelPermiso(rol.concesiones, permiso.clave)}
                  origenes={origenes}
                  misPermisos={misPermisos}
                  editable={editable}
                  ocupado={ocupado}
                  alAplicar={props.alAplicar}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
