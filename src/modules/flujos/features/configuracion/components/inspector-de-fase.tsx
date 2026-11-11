'use client'

import { Bloque } from '@/shared/ui/bloque'
import { Drawer } from '@/shared/ui/drawer'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import type { RolLeido } from '../../../entities/lectura-de-fase'
import { LecturaDeDatos, LecturaDeRequisitos, LecturaDeSalidas } from './bloques-del-inspector'
import type { HuecosDelFlujo } from './huecos'

type Props = {
  abierto: boolean
  alCerrar: () => void
  flujo: FlujoParaConfigurar
  nombreDelFlujo: string
  fase: FaseParaConfigurar
  roles: readonly RolLeido[]
  huecos: HuecosDelFlujo
}

// El inspector de una fase (`?fase=<id>`): un `<Drawer>` con tres bloques que hoy sólo muestran lo leído; debajo de cada uno, su hueco, donde 5.04 (Datos),
// 5.06 (Salidas y quién mueve) y 5.08 (Requisitos para entrar) ponen sus formularios. Se pide recién al abrirlo (`diferidos.tsx`).
export function InspectorDeFase({
  abierto,
  alCerrar,
  flujo,
  nombreDelFlujo,
  fase,
  roles,
  huecos,
}: Props) {
  const Datos = huecos.bloques?.datos
  const Salidas = huecos.bloques?.salidas
  const Requisitos = huecos.bloques?.requisitos
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={fase.nombre}
      descripcion={`Fase de ${nombreDelFlujo}`}
      ancho="amplio"
    >
      <div className="grid gap-4 px-4 pb-4">
        <Bloque titulo="Datos">
          <LecturaDeDatos fase={fase} />
          {Datos ? <Datos flujo={flujo} fase={fase} /> : null}
        </Bloque>
        <Bloque titulo="Salidas y quién mueve">
          <LecturaDeSalidas flujo={flujo} fase={fase} roles={roles} />
          {Salidas ? <Salidas flujo={flujo} fase={fase} /> : null}
        </Bloque>
        <Bloque titulo="Requisitos para entrar">
          <LecturaDeRequisitos flujo={flujo} fase={fase} />
          {Requisitos ? <Requisitos flujo={flujo} fase={fase} /> : null}
        </Bloque>
      </div>
    </Drawer>
  )
}
