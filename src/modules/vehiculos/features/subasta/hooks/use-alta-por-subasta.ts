'use client'

import { useEffect, useRef, useState } from 'react'
import type { CampoDeLayout } from '@/modules/origenes/client'
import type { CampoDeVehiculo } from '../../../entities/campo'
import type { Fuentes } from '../../../entities/esquema'
import { columnasDeEntrada, type DatosDeSubasta } from '../../../entities/subasta'
import type { ResultadoDeFotos } from '../../../entities/subasta-fotos'
import type { FormularioDeVehiculo } from '../../alta/hooks/use-formulario-de-vehiculo'
import type { Linea } from '../lineas'
import { useAltaDeLista } from './use-alta-de-lista'
import { useConsultaDeSubasta } from './use-consulta-de-subasta'
import type { GuardadoDeLinea } from './use-guardado-de-subasta'

type Args = {
  origenId: string
  // Los campos activos del layout.
  campos: readonly CampoDeLayout[]
  fuentes: Fuentes
  estado: FormularioDeVehiculo
  traerFotos: (pedido: {
    vehiculoId: string
    raw: unknown
    nombre?: string
  }) => Promise<ResultadoDeFotos>
  // Lo último que se guardó desde el formulario y de qué línea venía.
  guardado: GuardadoDeLinea | null
  // Lo que arranca escrito en el pegado (el panel del vehículo de la hoja de cotizar trae lo que se tipeó en su buscador).
  textoInicial?: string
  // Consulta una vez al montarse, con ese texto. Cada consulta gasta cuota de apibara: quien lo pide es quien acaba de decidir traer.
  consultarAlMontar?: boolean
}

// Consulta una vez, al montarse, con lo que arrancó pegado. Un ref con la última `consultar` evita depender de su identidad (cambia en cada dibujo), y otro,
// que corra de nuevo (el modo estricto monta los efectos dos veces): cada consulta gasta cuota de apibara.
function useConsultaAlMontar(
  consultar: (texto: string) => Promise<void>,
  texto: string,
  pedido: boolean,
) {
  const ultima = useRef(consultar)
  useEffect(() => {
    ultima.current = consultar
  })
  const hecho = useRef(false)
  useEffect(() => {
    if (pedido && !hecho.current) {
      hecho.current = true
      void ultima.current(texto)
    }
  }, [pedido, texto])
}

const SIN_DATOS: DatosDeSubasta = { columnas: {}, atributos: {}, sinCoincidencia: [] }

// El alta desde apibara: lo pegado, la consulta, qué línea está en el formulario y el guardado en
// lote. Conecta las tres cosas con el formulario del panel, que sigue siendo quien guarda.
export function useAltaPorSubasta({
  origenId,
  campos,
  fuentes,
  estado,
  traerFotos,
  guardado,
  textoInicial = '',
  consultarAlMontar = false,
}: Args) {
  const [texto, setTexto] = useState(textoInicial)
  const [sinLlenar, setSinLlenar] = useState<string[]>([])
  const consulta = useConsultaDeSubasta({ origenId, campos })
  const { fijarEstado } = consulta
  const lote = useAltaDeLista({
    origenId,
    fuentes,
    campos: campos as readonly CampoDeVehiculo[],
    fijarEstado,
    traerFotos,
  })
  const ocupado = consulta.consultando || lote.progreso !== null || estado.enCurso

  // Lo que se guardó desde el formulario y venía de una línea: esa línea queda guardada.
  useEffect(() => {
    if (guardado?.clave) {
      fijarEstado(guardado.clave, {
        tipo: 'guardada',
        vehiculoId: guardado.vehiculoId,
        numero: guardado.numero,
      })
    }
  }, [guardado, fijarEstado])

  // Pone la línea en el formulario. Con varias líneas, guardar una no cierra el panel: quedan las
  // demás (por eso la clave sólo viaja cuando son más de una).
  function usar(linea: Linea, total: number) {
    const { estado: dela } = linea
    if (dela.tipo !== 'lista' && dela.tipo !== 'sin_guardar') {
      return
    }
    setSinLlenar(dela.datos.sinCoincidencia.map((una) => `${una.etiqueta} («${una.valor}»)`))
    estado.aplicarSubasta(dela.datos, {
      consulta: dela.ficha.consulta,
      raw: dela.ficha.data,
      clave: total > 1 ? linea.clave : null,
    })
  }

  const consultar = async (aConsultar: string) => {
    const finales = await consulta.consultar(aConsultar)
    const [una] = finales
    if (finales.length === 1 && una) {
      usar(una, 1)
    }
  }
  useConsultaAlMontar(consultar, textoInicial, consultarAlMontar)

  return {
    texto,
    setTexto,
    sinLlenar,
    consulta,
    lote,
    ocupado,
    // Una sola línea y bien: llena la ficha sin pedir otro clic.
    consultar: () => consultar(texto),
    usar: (linea: Linea) => {
      usar(linea, consulta.lineas.length)
    },
    reintentar: async (linea: Linea) => {
      const nueva = await consulta.reintentar(linea)
      if (consulta.lineas.length === 1) {
        usar(nueva, 1)
      }
    },
    // Lo pegado no se pierde: el enlace, el VIN o el lote pasan al formulario.
    seguirAMano: (linea: Linea) => {
      if (linea.entrada) {
        estado.aplicarSubasta({ ...SIN_DATOS, columnas: columnasDeEntrada(linea.entrada) }, null)
        setSinLlenar([])
      }
    },
  }
}
