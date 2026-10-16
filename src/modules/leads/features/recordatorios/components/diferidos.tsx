'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDeRecordatorios } from './esqueleto-de-recordatorios'

// El modal de agendar y editar se pide recién al abrirse: «Seguimientos» no carga su código para
// mostrar la lista. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDeRecordatorioDiferido = diferido(() =>
  import('./modal-de-recordatorio').then((modulo) => modulo.ModalDeRecordatorio),
)

// «Tus recordatorios» de la ficha se piden al abrir «Seguimientos»: la ficha no carga su código.
export const RecordatoriosDelLeadDiferido = diferido(
  () => import('./recordatorios-del-lead').then((modulo) => modulo.RecordatoriosDelLead),
  { esqueleto: <EsqueletoDeRecordatorios etiqueta="Cargando los recordatorios" />, aviso: 'aqui' },
)
