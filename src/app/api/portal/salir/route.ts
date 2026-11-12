import type { NextRequest } from 'next/server'
import { borrarCookie, comenzar, origenNoPermitido, vacia } from '../_comun'

// La salida del portal (8.07-3): borra la cookie, haya o no sesión. No revoca nada en la base: la sesión es una cookie firmada sin
// estado; el corte del lado del CRM es «Volver a otorgar» o revocar (D10).
//
//   POST   204 | 403 | 503

export async function POST(peticion: NextRequest) {
  const cortar = (await comenzar()) ?? (await origenNoPermitido(peticion))
  if (cortar) return cortar
  return borrarCookie(vacia(204))
}
