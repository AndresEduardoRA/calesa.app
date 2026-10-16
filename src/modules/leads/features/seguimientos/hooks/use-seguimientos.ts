'use client'

import { useRef, useState } from 'react'
import { enElTope, TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { avisarError } from '@/shared/ui/toasts'
import { leerMasSeguimientos, leerSeguimiento } from '../../../composicion.client'
import { PAGINAS_PARA_BUSCAR_UN_SEGUIMIENTO } from '../../../entities/edicion-de-seguimiento'
import {
  conLoPuestoMientras,
  cursorDeUnaFecha,
  ponerEnLaVentana,
} from '../../../entities/pagina-de-seguimientos'
import {
  cursorDeSeguimientos,
  sumarPagina,
  type PaginaDeSeguimientos,
  type Seguimiento,
} from '../../../entities/seguimiento'

// Lo que identifica la página que trae el servidor: si cambia (se volvió a leer la ficha), la lista
// local se vuelve a sembrar con lo que llegó.
const firmaDe = (pagina: PaginaDeSeguimientos) =>
  `${String(pagina.puedoAnotar)}|${String(pagina.hayMas)}|${pagina.seguimientos
    .map((s) => `${s.id}:${s.actualizadoEn}`)
    .join(',')}`

type Cursor = { antesEn: string; antesId: string }

// Lo cargado: una ventana que empieza en lo más nuevo (`desde` nulo) o en un día («Ir a una fecha»,
// con el cursor que la sembró) y termina donde llegó «Ver más».
type Leido = {
  lista: Seguimiento[]
  hayMas: boolean
  puedoAnotar: boolean
  desde: string | null
  inicio: Cursor | null
}

export type ResultadoDeLectura = 'hecha' | 'ocupada' | 'fallo'

const MENSAJE_SIN_RED = { codigo: 'inesperado', mensaje: 'No pudimos llegar al servidor.' } as const

const desdeInicial = (inicial: PaginaDeSeguimientos): Leido => ({
  lista: inicial.seguimientos,
  hayMas: inicial.hayMas,
  puedoAnotar: inicial.puedoAnotar,
  desde: null,
  inicio: null,
})

// Páginas desde `desde` (con su cursor) hasta que `basta` diga que alcanza, no haya más, se llegue al
// tope de lo cargado o se lean `tope` páginas. Nulo si una lectura falló (ya se avisó).
async function leerPaginas(
  leadId: string,
  desde: Leido,
  basta: (lista: readonly Seguimiento[]) => boolean,
  tope: number,
): Promise<Leido | null> {
  let actual = desde
  for (
    let leidas = 0;
    leidas < tope && actual.hayMas && !basta(actual.lista) && !enElTope(actual.lista);
    leidas += 1
  ) {
    const leido = await leerMasSeguimientos({
      leadId,
      antes: cursorDeSeguimientos(actual.lista),
    }).catch(() => null)
    if (!leido?.ok) {
      avisarError(leido?.error ?? MENSAJE_SIN_RED)
      return null
    }
    actual = {
      ...actual,
      lista: sumarPagina(actual.lista, leido.data.seguimientos),
      hayMas: leido.data.hayMas,
      puedoAnotar: leido.data.puedoAnotar,
    }
  }
  return actual
}

// Una página desde `inicio` y, si `idSuelto` no vino en ella, ése por su id: dos pedidos como mucho,
// cargue lo que cargue. Nulo si algo falló (ya se avisó). `suelto` es `undefined` si no hizo falta
// leerlo y `null` si ya no se ve.
async function leerVentana(
  leadId: string,
  inicio: Cursor | null,
  idSuelto: string | null,
): Promise<{ pagina: PaginaDeSeguimientos; suelto: Seguimiento | null | undefined } | null> {
  const pagina = await leerMasSeguimientos({ leadId, antes: inicio }).catch(() => null)
  if (!pagina?.ok) {
    avisarError(pagina?.error ?? MENSAJE_SIN_RED)
    return null
  }
  if (idSuelto === null || pagina.data.seguimientos.some((s) => s.id === idSuelto)) {
    return { pagina: pagina.data, suelto: undefined }
  }
  const uno = await leerSeguimiento({ leadId, id: idSuelto }).catch(() => null)
  if (!uno?.ok) {
    avisarError(uno?.error ?? MENSAJE_SIN_RED)
    return null
  }
  return { pagina: pagina.data, suelto: uno.data }
}

// Una lectura a la vez (con una marca propia: dos clics en el mismo instante ven el mismo estado), y
// lo que se pone mientras una lectura reemplaza la ventana, para volver a aplicarlo sobre lo que llegue.
function useUnaLecturaALaVez() {
  const [cargando, setCargando] = useState(false)
  const enVuelo = useRef(false)
  const puestos = useRef<Seguimiento[] | null>(null)
  return {
    cargando,
    puestos,
    enExclusiva: async (
      lectura: () => Promise<ResultadoDeLectura>,
    ): Promise<ResultadoDeLectura> => {
      if (enVuelo.current) {
        return 'ocupada'
      }
      enVuelo.current = true
      setCargando(true)
      try {
        return await lectura()
      } finally {
        enVuelo.current = false
        puestos.current = null
        setCargando(false)
      }
    },
  }
}

// «Ver más» y buscar suman sólo las páginas nuevas (lo que no estaba en `desde`) sobre lo de ahora: lo
// que se anotó, editó o eliminó mientras se esperaba no vuelve a su versión vieja. Nunca más que el
// tope: lo que pasa se corta (y queda «hay más»).
const sumarLoNuevo =
  (desde: Leido) =>
  (antes: Leido, leido: Leido): Leido => {
    const vistos = new Set(desde.lista.map((s) => s.id))
    const lista = sumarPagina(
      antes.lista,
      leido.lista.filter((s) => !vistos.has(s.id)),
    )
    return {
      ...antes,
      lista: lista.slice(0, TOPE_DE_LO_CARGADO),
      hayMas: leido.hayMas || lista.length > TOPE_DE_LO_CARGADO,
      puedoAnotar: leido.puedoAnotar,
    }
  }

// La línea de tiempo de un lead: la primera página la trae quien la monta (el servidor en la ficha, el
// navegador en el drawer); lo que se anota, edita o elimina se pone en su lugar con la respuesta (no se
// vuelve a leer la ficha), y «Ver más» pide la siguiente desde el navegador, hasta el tope.
// Ninguna lectura cuesta más con lo cargado: `releer` («Recargar» tras un conflicto) lee sólo la
// primera página de la ventana y, si el que está en conflicto no vino en ella, ése por su id (queda en
// `sueltos`: lo ve el modal, no la lista); `buscar` pide hasta 5 páginas (el de la URL al recargar).
export function useSeguimientos(leadId: string, inicial: PaginaDeSeguimientos) {
  const firma = firmaDe(inicial)
  const [vista, setVista] = useState(firma)
  const [leido, setLeido] = useState<Leido>(() => desdeInicial(inicial))
  const [sueltos, setSueltos] = useState<Seguimiento[]>([])
  if (vista !== firma) {
    setVista(firma)
    setLeido(desdeInicial(inicial))
    setSueltos([])
  }
  const { cargando, puestos, enExclusiva } = useUnaLecturaALaVez()

  const sumar = (basta: (lista: readonly Seguimiento[]) => boolean, tope: number) =>
    enExclusiva(async () => {
      const nuevo = await leerPaginas(leadId, leido, basta, tope)
      if (!nuevo) {
        return 'fallo'
      }
      setLeido((antes) => sumarLoNuevo(leido)(antes, nuevo))
      return 'hecha'
    })

  // Reemplaza la ventana por la página desde `inicio` (lo puesto mientras tanto se vuelve a aplicar).
  const reemplazar = (inicio: Cursor | null, desde: string | null, idSuelto: string | null) =>
    enExclusiva(async () => {
      puestos.current = []
      const leida = await leerVentana(leadId, inicio, idSuelto)
      if (!leida) {
        return 'fallo'
      }
      const { seguimientos, hayMas, puedoAnotar } = leida.pagina
      const lista = conLoPuestoMientras({ lista: seguimientos, hayMas, desde }, puestos.current)
      setLeido({ lista, hayMas, puedoAnotar, desde, inicio })
      const { suelto } = leida
      if (suelto !== undefined) {
        setSueltos((antes) => [
          ...antes.filter((s) => s.id !== idSuelto),
          ...(suelto ? [suelto] : []),
        ])
      }
      return 'hecha'
    })

  return {
    ...leido,
    // Los que se leyeron por su id fuera de la ventana: el modal los encuentra, la lista no los dibuja.
    sueltos,
    cargando,
    enElTope: enElTope(leido.lista),
    cargarMas: () => sumar(() => false, 1),
    // «Recargar» tras un conflicto: la primera página de la ventana, y el que estaba en conflicto por
    // su id si no vino en ella. Lo cargado más allá vuelve a «Ver más».
    releer: (idEnConflicto: string | null = null) =>
      reemplazar(leido.inicio, leido.desde, idEnConflicto),
    // «hecha» = se buscó de verdad (lo haya encontrado o no); «ocupada» u «fallo», no se sabe.
    buscar: (id: string) =>
      sumar((lista) => lista.some((s) => s.id === id), PAGINAS_PARA_BUSCAR_UN_SEGUIMIENTO),
    // «Ir a una fecha»: lo de ese día y lo anterior, con el mismo cursor de «Ver más».
    irAUnaFecha: (dia: string, zona: string): Promise<ResultadoDeLectura> => {
      const inicio = cursorDeUnaFecha(dia, zona)
      return inicio ? reemplazar(inicio, dia, null) : Promise.resolve<ResultadoDeLectura>('fallo')
    },
    volverAlPrincipio: () => reemplazar(null, null, null),
    // Lo que vuelve de una RPC: en su lugar si cae en la ventana, o fuera (también si quedó eliminado).
    poner: (uno: Seguimiento) => {
      setLeido((antes) => ({ ...antes, lista: ponerEnLaVentana(antes, uno) }))
      setSueltos((antes) =>
        antes.flatMap((s) => (s.id !== uno.id ? [s] : uno.eliminado ? [] : [uno])),
      )
      puestos.current?.push(uno)
    },
  }
}

export type Seguimientos = ReturnType<typeof useSeguimientos>
