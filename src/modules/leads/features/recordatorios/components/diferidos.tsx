'use client'

import dynamic from 'next/dynamic'
import { EsqueletoDeRecordatorios } from './esqueleto-de-recordatorios'

// El modal de agendar y editar se pide recién al abrirse: «Seguimientos» no carga su código para
// mostrar la lista. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeRecordatorioDiferido = dynamic(
  () => import('./modal-de-recordatorio').then((modulo) => modulo.ModalDeRecordatorio),
  { ssr: false },
)

// «Tus recordatorios» de la ficha se piden al abrir «Seguimientos»: la ficha (y el shell, que llega a
// ella por la entrada del módulo) no carga su código. Ya no se dibujaban en el servidor.
export const RecordatoriosDelLeadDiferido = dynamic(
  () => import('./recordatorios-del-lead').then((modulo) => modulo.RecordatoriosDelLead),
  {
    ssr: false,
    loading: () => <EsqueletoDeRecordatorios etiqueta="Cargando los recordatorios" />,
  },
)
