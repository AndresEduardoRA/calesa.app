import type { ReactNode } from 'react'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import {
  marcasDeLaFase,
  resumenDeRequisitos,
  rolesDeLaFase,
  salidasDeLaFase,
  textoDeLaDemora,
  type RolLeido,
} from '../../../entities/lectura-de-fase'

const siNo = (valor: boolean) => (valor ? 'Sí' : 'No')

function Datos({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <dt className="text-(--color-ink-soft)">{rotulo}</dt>
      <dd className="text-(--color-ink)">{children}</dd>
    </div>
  )
}

// «Datos»: lo que dice la fila de la fase, en texto. Sólo se lee; escribirlo es del 5.04.
export function LecturaDeDatos({ fase }: { fase: FaseParaConfigurar }) {
  const marcas = marcasDeLaFase(fase)
  return (
    <dl className="grid gap-1 text-(length:--text-sm)">
      <Datos rotulo="Estado:">{fase.activa ? 'Activa' : 'Jubilada'}</Datos>
      {marcas.length > 0 ? <Datos rotulo="Marcas:">{marcas.join(', ')}</Datos> : null}
      <Datos rotulo="Demora:">{textoDeLaDemora(fase.demoraDias)}</Datos>
      <Datos rotulo="Pide nota al entrar:">{siNo(fase.notaObligatoria)}</Datos>
      <Datos rotulo="Permite contenedor:">{siNo(fase.permiteContenedor)}</Datos>
      <Datos rotulo="Permite aduana:">{siNo(fase.permiteAduana)}</Datos>
      <Datos rotulo="Se publica en la web:">{siNo(fase.publicaWeb)}</Datos>
      <Datos rotulo="Visible en el portal:">
        {fase.visiblePortal ? (fase.aliasPortal ? `Sí, como «${fase.aliasPortal}»` : 'Sí') : 'No'}
      </Datos>
    </dl>
  )
}

// «Salidas y quién mueve»: a dónde puede ir una unidad desde esta fase, con los roles de cada salida, y los roles que pueden moverla hasta aquí.
export function LecturaDeSalidas({
  flujo,
  fase,
  roles,
}: {
  flujo: FlujoParaConfigurar
  fase: FaseParaConfigurar
  roles: readonly RolLeido[]
}) {
  const salidas = salidasDeLaFase(flujo, fase.id, roles)
  const deLaFase = rolesDeLaFase(flujo, fase.id, roles)
  return (
    <div className="grid gap-2 text-(length:--text-sm)">
      <p className="text-(--color-ink)">
        <span className="text-(--color-ink-soft)">Pueden moverla hasta aquí: </span>
        {deLaFase.length > 0 ? deLaFase.join(', ') : 'cualquiera con permiso para mover'}
      </p>
      {salidas.length === 0 ? (
        <p className="text-(--color-ink-soft)">Sin salidas.</p>
      ) : (
        <ul className="grid gap-1">
          {salidas.map((salida, i) => (
            <li key={`${salida.destino}-${String(i)}`} className="text-(--color-ink)">
              {salida.accion}: a {salida.destino}
              <span className="text-(--color-ink-soft)">
                {salida.roles.length > 0 ? ` · Sólo ${salida.roles.join(', ')}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
      {flujo.truncado.transiciones || flujo.truncado.roles ? (
        <p role="status" className="text-(--color-ink-soft)">
          Hay más salidas o roles de los que se leyeron.
        </p>
      ) : null}
    </div>
  )
}

// «Requisitos para entrar»: cuántos hay por tipo y si bloquean. Sus nombres y claves los dicen los pasos de requisitos y de documentos.
export function LecturaDeRequisitos({
  flujo,
  fase,
}: {
  flujo: FlujoParaConfigurar
  fase: FaseParaConfigurar
}) {
  const resumen = resumenDeRequisitos(flujo.requisitos, fase.id)
  return resumen.length === 0 ? (
    <p className="text-(length:--text-sm) text-(--color-ink-soft)">Sin requisitos.</p>
  ) : (
    <ul className="grid gap-1 text-(length:--text-sm) text-(--color-ink)">
      {resumen.map((linea) => (
        <li key={linea}>{linea}</li>
      ))}
    </ul>
  )
}
