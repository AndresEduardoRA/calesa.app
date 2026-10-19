'use client'

import { useEffect, useState } from 'react'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import {
  alOlvidarDatosDelAlta,
  datosDelAltaEnMemoria,
  leerDatosDelAlta,
  type DatosDelAlta,
} from '../../../composicion.client'
import { usePanelDeAlta } from '../hooks/use-panel-de-alta'
import { AltaCargada } from './alta-cargada'
import { EsperaDelAlta } from './espera-del-alta'

// Lo que el botón de la barra adelanta cuando el puntero llega o toma el foco: leer lo que el alta necesita antes del clic. Un fallo acá
// no se dice (nadie pidió nada todavía): el clic lo lee de nuevo y, si vuelve a fallar, lo dice en el drawer.
export function adelantarLaLectura() {
  void leerDatosDelAlta().catch(() => undefined)
}

// «Nuevo lead» en el navegador: lee el contexto del alta y el layout de campos (el shell ya no los manda con cada pantalla) y, con ellos,
// monta el drawer de verdad. Se monta la primera vez que se abre y se queda: lo escrito vive en `AltaCargada`. Mientras lee, el drawer
// está abierto con su esqueleto; si falla, lo dice con «Reintentar». Cada vez que se abre vuelve a pedir lo leído (la memoria lo da al
// instante si es de hace menos de un minuto): si cambió un origen o un tipo, la lista se renueva sin tocar lo escrito.
export function AltaConDatos() {
  const panel = usePanelDeAlta()
  const { lectura, reintentar } = useLecturaAlMontar(leerDatosDelAlta, 'alta')
  const [renovado, setRenovado] = useState<DatosDelAlta | null>(null)
  // Lo leído dejó de valer (un alta rechazada porque un origen o un tipo se apagó, o se cambió uno en Configuración): hay que leer de nuevo.
  const [olvidos, setOlvidos] = useState(0)
  useEffect(
    () =>
      alOlvidarDatosDelAlta(() => {
        setOlvidos((n) => n + 1)
      }),
    [],
  )
  useEffect(() => {
    if (!panel.abierto) {
      return
    }
    let vigente = true
    void leerDatosDelAlta()
      .then((resultado) => {
        if (vigente && resultado.ok) {
          setRenovado(resultado.data)
        }
      })
      .catch(() => undefined)
    return () => {
      vigente = false
    }
  }, [panel.abierto, olvidos])
  const datos =
    renovado ?? (lectura.estado === 'leido' ? lectura.dato : null) ?? datosDelAltaEnMemoria()
  if (datos) {
    return <AltaCargada contexto={datos.contexto} campos={datos.campos} />
  }
  return <EsperaDelAlta fallo={lectura.estado === 'fallo'} alReintentar={reintentar} />
}
