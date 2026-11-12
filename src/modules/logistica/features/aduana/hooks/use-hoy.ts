'use client'

import { useState } from 'react'
import { diaEnZona } from '@/shared/lib/fechas'
import { useRegional } from '@/shared/ui/regional'

// «Hoy» en el calendario de la empresa, `AAAA-MM-DD`: lo que `vencimientoDe` compara. Se fija al montar: una lista abierta pasada la medianoche se corrige al recargar.
export function useHoy(): string {
  const { zonaHoraria } = useRegional()
  const [hoy] = useState(() => diaEnZona(new Date().toISOString(), { zona: zonaHoraria }))
  return hoy
}
