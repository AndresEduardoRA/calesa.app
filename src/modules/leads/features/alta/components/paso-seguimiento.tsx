'use client'

import { diferido } from '@/shared/ui/diferido'

// El paso 2 se pide recién al abrirlo: ni los campos del seguimiento ni el editor viajan con el drawer.
// Mientras llega, un marco del alto de los campos.
export const PasoSeguimiento = diferido(() => import('./paso-seguimiento-cargado'), {
  aviso: 'aqui',
  esqueleto: (
    <div role="status">
      <span className="sr-only">Cargando el seguimiento…</span>
      <div
        aria-hidden
        className="h-[26rem] animate-pulse rounded-(--radius-md) border border-(--color-line) bg-(--color-paper-dim)"
      />
    </div>
  ),
})
