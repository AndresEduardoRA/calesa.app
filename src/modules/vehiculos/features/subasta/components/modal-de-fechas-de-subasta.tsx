'use client'

import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { useRegional } from '@/shared/ui/regional'
import { ayudaDeZona, type FechasDeSubasta } from '../../../entities/fechas-de-subasta'
import { useFechasDeSubasta } from '../hooks/use-fechas-de-subasta'

type Props = {
  abierto: boolean
  alCerrar: () => void
  vehiculoId: string
  actualizadoEn: string
  fechas: FechasDeSubasta
  // «Ahora» (ISO) de quien dibuja: con él se dice el desfase de la zona cuando todavía no hay fecha.
  ahora: string
}

const ID_DEL_INICIO = 'subasta-inicio'

// «Editar fechas» de la subasta (`?panel=fechas-de-subasta`): el inicio y el cierre, escritos en la zona de quien edita y guardados en
// UTC. Vacío borra la fecha. Quien lo monta le da una `key` por apertura: cada una empieza de cero.
export function ModalDeFechasDeSubasta({
  abierto,
  alCerrar,
  vehiculoId,
  actualizadoEn,
  fechas,
  ahora,
}: Props) {
  const { zonaDeLaPersona: zona } = useRegional()
  const f = useFechasDeSubasta({ vehiculoId, actualizadoEn, fechas, zona, abierto, alCerrar })
  return (
    <ModalDeFormulario
      id="fechas-de-subasta"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Fechas de la subasta"
      descripcion="Si la subasta se refresca, manda lo que trae la plataforma."
      focoInicial={() => document.getElementById(ID_DEL_INICIO)}
      formulario={f}
      guardar={{ etiqueta: 'Guardar', enCurso: 'Guardando…' }}
    >
      <Campo
        nombre={ID_DEL_INICIO}
        etiqueta="Fecha de la subasta"
        type="datetime-local"
        value={f.valores.inicio}
        onChange={(evento) => {
          f.escribir({ inicio: evento.target.value })
        }}
        error={f.errores['inicio']}
        ayuda={ayudaDeZona(zona, fechas.subastaEn, ahora)}
      />
      <Campo
        nombre="subasta-cierre"
        etiqueta="Cierre (subasta temporizada)"
        type="datetime-local"
        value={f.valores.cierre}
        onChange={(evento) => {
          f.escribir({ cierre: evento.target.value })
        }}
        error={f.errores['cierre']}
        ayuda="Vacío si la subasta no tiene un cierre aparte."
      />
    </ModalDeFormulario>
  )
}
