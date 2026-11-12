'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'
import { Button } from '@/shared/ui/button'
import { useLecturaAlMontar, type LecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import {
  vistaDelImpacto,
  type ImpactoDeFase,
  type VistaDeImpacto,
} from '../../../entities/fases/vista-de-impacto'
import type { FaseParaConfigurar } from '../../../entities/flujo'
import type { ListaDeFasesEnPantalla } from '../hooks/use-lista-de-fases'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // La que se jubila o elimina (la última que se vio, mientras el diálogo se va).
  fase: FaseParaConfigurar | null
  lista: ListaDeFasesEnPantalla
  // A dónde vuelve el foco al cerrar: el «⋯» de esa fila, que sigue ahí si no se eliminó.
  focoAlCerrar: () => HTMLElement | boolean
}

function EstadoDeLaLectura({
  lectura,
  alReintentar,
}: {
  lectura: LecturaAlMontar<ImpactoDeFase>
  alReintentar: () => void
}) {
  if (lectura.estado === 'leyendo') {
    return (
      <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
        Mirando qué usa la fase…
      </p>
    )
  }
  if (lectura.estado === 'fallo') {
    return (
      <Aviso tono="peligro">
        <span className="grid gap-2">
          <span>{lectura.error.mensaje}</span>
          <Button variant="outline" size="sm" onClick={alReintentar}>
            Reintentar
          </Button>
        </span>
      </Aviso>
    )
  }
  return null
}

// Los textos de la confirmación: mientras no se lee qué usa la fase, los de «Jubilar o eliminar» sin decir qué va a pasar.
function textosDe(fase: FaseParaConfigurar | null, vista: VistaDeImpacto | null) {
  return {
    titulo: vista && fase ? `${vista.etiqueta} «${fase.nombre}»` : 'Jubilar o eliminar la fase',
    descripcion: vista?.texto ?? 'Mirando qué usa la fase…',
    etiqueta: vista?.etiqueta ?? 'Jubilar fase',
  }
}

// «Jubilar o eliminar» una fase (`?panel=eliminar-fase&quitar=<id>`): al abrirse lee qué usa la fase (`fase_impacto`) y dice qué va a pasar. Una fase
// bloqueada se explica y no se confirma (D5); si entre la lectura y el clic el uso cambió, la base decide y el aviso dice lo que pasó. Quien lo monta le da
// una `key` por apertura: cada una lee de nuevo.
export function ConfirmarEliminarFase({ abierto, alCerrar, fase, lista, focoAlCerrar }: Props) {
  const { lectura, reintentar } = useLecturaAlMontar(
    () => lista.leerImpacto(fase?.id ?? ''),
    fase?.id ?? '',
  )
  const vista =
    fase && lectura.estado === 'leido' ? vistaDelImpacto(fase.nombre, lectura.dato) : null

  const textos = textosDe(fase, vista)

  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={async () => {
        if (fase) {
          await lista.quitar(fase)
        }
        alCerrar()
      }}
      titulo={textos.titulo}
      descripcion={textos.descripcion}
      etiquetaConfirmar={textos.etiqueta}
      enCurso={lista.enCurso}
      deshabilitado={vista === null || !vista.puedeConfirmar}
      focoAlCerrar={focoAlCerrar}
    >
      <EstadoDeLaLectura lectura={lectura} alReintentar={reintentar} />
      {vista?.avisos.map((aviso) => (
        <Aviso key={aviso} tono="aviso">
          {aviso}
        </Aviso>
      ))}
    </Confirmar>
  )
}
