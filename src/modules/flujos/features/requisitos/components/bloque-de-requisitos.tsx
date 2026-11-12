'use client'

import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { useFocoTrasMover } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import { firmaDelOrden } from '../../../entities/requisitos/vista-de-fase'
import { useBloqueanteDeRequisito } from '../hooks/use-bloqueante-de-requisito'
import { useAgregarRequisito } from '../hooks/use-agregar-requisito'
import { useEditarRequisitoPorUrl } from '../hooks/use-editar-requisito-por-url'
import { useEliminarRequisitoPorUrl } from '../hooks/use-eliminar-requisito-por-url'
import { useRequisitosDeLaFase } from '../hooks/use-requisitos-de-la-fase'
import { AgregarRequisito } from './agregar-requisito'
import { ConfirmarBloqueo } from './confirmar-bloqueo'
import { EliminarRequisitoDiferido } from './diferidos'
import { EdicionDeRequisito } from './edicion-de-requisito'
import { ListaDeRequisitos } from './lista-de-requisitos'

type Props = { flujo: FlujoParaConfigurar; fase: FaseParaConfigurar }

// El hueco `bloques.requisitos` del inspector (5.08), bajo el resumen de lo leído: los requisitos de la fase en su orden (descripción, «Bloqueante» o
// «Informativo»), el interruptor «Bloqueante» con su aviso de impacto en línea, ordenarlos con botones, editarlos, quitarlos con confirmación en la URL y «Agregar requisito» (dato, documento o espera). Una escritura a la vez; la lista la trae
// la página releída. Quien llega aquí configura el flujo; la base lo vuelve a exigir en cada escritura.
export function BloqueDeRequisitos({ flujo, fase }: Props) {
  const r = useRequisitosDeLaFase(flujo, fase)
  const agregar = useAgregarRequisito()
  const editar = useEditarRequisitoPorUrl(r.requisitos)
  const quitar = useEliminarRequisitoPorUrl(r.requisitos)
  const quitarVisto = useAbiertoAlgunaVez(quitar.abierto)
  const prefijo = `requisito-${fase.id}`
  const bloqueo = useBloqueanteDeRequisito(r, flujo.ambito, fase.nombre, prefijo)
  const movido = r.movimiento
  // El foco vuelve al botón cuando la lista ya está reordenada: la página trae el orden nuevo después de la respuesta, y mover la fila lo quitaría antes.
  useFocoTrasMover(
    prefijo,
    movido && firmaDelOrden(r.requisitos) !== movido.firmaAntes ? movido : null,
  )

  return (
    <div className="grid gap-3">
      {r.opciones.fallo ? (
        <Aviso tono="aviso">
          No pudimos leer los tipos de documento.{' '}
          <Button variant="link" className="h-auto p-0" onClick={r.opciones.reintentar}>
            Reintentar
          </Button>
        </Aviso>
      ) : null}
      {flujo.truncado.requisitos ? (
        <AvisoDeTope texto="Se muestran los primeros 500 requisitos del flujo." />
      ) : null}
      <ListaDeRequisitos
        requisitos={r}
        prefijo={prefijo}
        alCambiarBloqueo={(requisito, valor) => void bloqueo.cambiar(requisito, valor)}
        alEditar={(id) => {
          // Sólo una forma abierta a la vez: la de agregar se cierra.
          if (agregar.forma !== null) {
            agregar.cerrar()
          }
          editar.abrir(id)
        }}
        alPedirQuitar={quitar.abrir}
      />
      <p role="status" className="sr-only">
        {r.anuncio}
      </p>
      {bloqueo.pendiente ? (
        <ConfirmarBloqueo
          descripcion={r.describir(bloqueo.pendiente.requisito)}
          resumen={bloqueo.pendiente.resumen}
          enCurso={r.enCurso}
          alConfirmar={() => void bloqueo.confirmar()}
          alCancelar={bloqueo.cancelar}
        />
      ) : null}
      {editar.requisito === null ? (
        <AgregarRequisito flujo={flujo} requisitos={r} agregar={agregar} prefijo={prefijo} />
      ) : (
        <EdicionDeRequisito
          requisitos={r}
          requisito={editar.requisito}
          prefijo={prefijo}
          cerrar={editar.cerrar}
        />
      )}
      {quitarVisto ? (
        <EliminarRequisitoDiferido
          abierto={quitar.abierto}
          alCerrar={quitar.cerrar}
          descripcion={quitar.requisito ? r.describir(quitar.requisito) : null}
          enCurso={r.enCurso}
          alQuitar={() => (quitar.requisito ? r.quitar(quitar.requisito) : Promise.resolve(false))}
          focoAlCerrar={() =>
            document.querySelector<HTMLElement>(
              `[data-mas-acciones="${prefijo}-${quitar.requisito?.id ?? ''}"]`,
            ) ?? true
          }
        />
      ) : null}
    </div>
  )
}
