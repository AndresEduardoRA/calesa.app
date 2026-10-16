'use client'

import { useRegional } from '@/shared/ui/regional'
import { RecordatoriosDelLead } from '../../recordatorios/components/recordatorios-del-lead'

// La pestaña «Recordatorios» del drawer rápido (`?pestana=recordatorios`): «Tus recordatorios», el
// mismo bloque que la ficha, con «Agendar» arriba. Lee su primera página al elegirse (desde el
// navegador); los completados, al abrir su plegado. El modal se dibuja dentro del drawer (Base UI lo
// anida: Esc cierra sólo el de arriba).
export function RecordatoriosDelRapido({ leadId }: { leadId: string }) {
  const { zonaHoraria } = useRegional()
  return <RecordatoriosDelLead leadId={leadId} zona={zonaHoraria} />
}
