'use client'

import { useMemo, useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { useAtajo } from '@/shared/ui/atajos'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import { useReintentoAlVolver } from '@/shared/ui/use-reintento-al-volver'
import { validarVehiculo, type Fuentes } from '../../../entities/esquema'
import type { DatosDeSubasta } from '../../../entities/subasta'
import {
  conDatosDeSubasta,
  valoresIniciales,
  type ValorDeFormulario,
  type ValoresDeFormulario,
} from '../../../entities/formulario'
import type { Vehiculo } from '../../../entities/vehiculo'
import { useVehiculos, type Envio } from './use-vehiculos'

// La consulta a apibara que llenó la ficha (`consulta`, lo que viaja al guardar; `raw`, para traer
// las fotos después), y de qué línea de lo pegado salió (si salió de una).
export type DeSubasta = { consulta: string; raw: Record<string, unknown>; clave: string | null }

export type Guardado = {
  id: string
  numero: number | null
  seguir: boolean
  // Lo que se dio de alta venía de apibara: quedan las fotos por traer.
  subasta: DeSubasta | null
}

type Args = {
  origenId: string
  // null = un alta.
  vehiculo: Vehiculo | null
  // Los datos comunes, los campos activos del layout y las categorías: el mismo esquema que
  // vuelve a armar el servidor.
  fuentes: Fuentes
  // Si quien mira no puede guardar, los atajos no hacen nada y no hay borrador.
  activo: boolean
  alGuardar: (guardado: Guardado) => void
}

type Estado = {
  // El id del alta en curso: lo genera el navegador, así reintentar no duplica.
  id: string
  valores: ValoresDeFormulario
  errores: Record<string, string>
  // «Rosa cambió este vehículo hace 3 min.»
  conflicto: string | null
  aviso: string | null
  // Un guardado que no llegó al servidor y espera a que vuelva la conexión.
  pendiente: { seguir: boolean } | null
  // De dónde se llenó la ficha, si fue de apibara. Viaja con el alta; editar no la lleva.
  subasta: DeSubasta | null
}

const nuevoId = () => crypto.randomUUID()

const limpio = (id: string, valores: ValoresDeFormulario): Estado => ({
  id,
  valores,
  errores: {},
  conflicto: null,
  aviso: null,
  pendiente: null,
  subasta: null,
})

// Lo que trajo apibara puesto encima de lo que había; los errores de antes ya no valen.
function conSubasta(
  antes: Estado,
  datos: DatosDeSubasta,
  subasta: DeSubasta | null,
  fuentes: Fuentes,
): Estado {
  return {
    ...antes,
    valores: conDatosDeSubasta(antes.valores, datos, fuentes.campos, {
      zona: fuentes.zona,
      locale: fuentes.locale,
    }),
    errores: {},
    aviso: null,
    subasta,
  }
}

// Lo que queda en pantalla después de un guardado que el servidor rechazó. Lo que ya se dice
// junto a un campo o en el aviso de conflicto no se repite arriba.
function trasRechazo(antes: Estado, error: ErrorApp, porCampo?: Record<string, string>): Estado {
  const esConflicto = error.codigo === 'conflicto'
  return {
    ...antes,
    pendiente: null,
    errores: porCampo ?? {},
    conflicto: esConflicto ? error.mensaje : null,
    aviso: esConflicto || porCampo ? null : error.mensaje,
  }
}

// Lo que muestra el formulario al abrirse: lo guardado, o en un alta el valor por defecto de cada
// campo del layout.
function useValoresIniciales(fuentes: Fuentes, vehiculo: Vehiculo | null): ValoresDeFormulario {
  return useMemo(
    () =>
      valoresIniciales({
        comunes: fuentes.comunes,
        campos: fuentes.campos,
        vehiculo,
        zona: fuentes.zona,
        locale: fuentes.locale,
      }),
    [fuentes, vehiculo],
  )
}

// El estado de dar de alta o editar un vehículo: valida con el esquema del layout antes de enviar,
// pinta los motivos junto a cada campo, guarda un borrador de lo escrito, muestra el conflicto si
// otra persona lo cambió y, si se cae la conexión, conserva todo y reintenta al volver.
export function useFormularioDeVehiculo({ origenId, vehiculo, fuentes, activo, alGuardar }: Args) {
  const iniciales = useValoresIniciales(fuentes, vehiculo)
  const [estado, setEstado] = useState(() => limpio(vehiculo?.id ?? nuevoId(), iniciales))
  const ediciones = useVehiculos()
  const borrador = useBorradorDeEstado({
    clave: vehiculo ? `vehiculo-${vehiculo.id}` : `vehiculo-nuevo-${origenId}`,
    valores: estado.valores,
    guardado: iniciales,
    alReponer: (cambios) => {
      setEstado((antes) => ({ ...antes, valores: { ...antes.valores, ...cambios } }))
    },
    activo,
  })

  function cambiar(clave: string, valor: ValorDeFormulario) {
    setEstado((antes) => {
      const { [clave]: _resuelto, ...errores } = antes.errores
      return { ...antes, valores: { ...antes.valores, [clave]: valor }, errores, aviso: null }
    })
  }

  // Llena el formulario con lo que trajo apibara (o, sin `raw`, sólo con lo que se pegó), encima de
  // lo que ya hay. Queda editable: nada se guarda hasta que la persona lo confirme.
  function aplicarSubasta(datos: DatosDeSubasta, subasta: DeSubasta | null) {
    setEstado((antes) => conSubasta(antes, datos, subasta, fuentes))
  }

  function guardado(numero: number | null, seguir: boolean) {
    borrador.limpiar()
    // Tras un alta, el formulario queda listo para el siguiente, con otro id.
    setEstado(vehiculo ? limpio(vehiculo.id, estado.valores) : limpio(nuevoId(), iniciales))
    alGuardar({ id: estado.id, numero, seguir, subasta: estado.subasta })
  }

  async function enviar(seguir: boolean): Promise<boolean> {
    if (!activo || ediciones.enCurso) {
      return false
    }
    const validacion = validarVehiculo(fuentes, estado.valores)
    if (!validacion.ok) {
      setEstado((antes) => ({ ...antes, errores: validacion.porCampo, aviso: null }))
      return false
    }
    const { valores } = estado
    if (vehiculo) {
      const { id, actualizadoEn: actualizadoEnEsperado } = vehiculo
      return resolver(await ediciones.guardar({ id, actualizadoEnEsperado, valores }), null, seguir)
    }
    const creado = await ediciones.crear({
      id: estado.id,
      origenId,
      valores,
      ...(estado.subasta ? { consulta: estado.subasta.consulta } : {}),
    })
    return resolver(creado, creado.ok ? creado.data.numero : null, seguir)
  }

  function resolver(resultado: Envio<unknown>, numero: number | null, seguir: boolean): boolean {
    if (resultado.ok) {
      guardado(numero, seguir)
      return true
    }
    if ('sinRed' in resultado) {
      setEstado((antes) => ({ ...antes, pendiente: { seguir }, aviso: null }))
      return false
    }
    setEstado((antes) => trasRechazo(antes, resultado.error, resultado.porCampo))
    return false
  }

  // Al volver la conexión sale solo lo que quedó esperando: el alta lleva su id y guardar lo ya
  // guardado no es un conflicto.
  const enLinea = useReintentoAlVolver(estado.pendiente, ({ seguir }) => enviar(seguir))
  useAtajo('guardar', () => void enviar(false), activo)
  // «Guardar y seguir»: en un alta deja el formulario listo para el siguiente.
  useAtajo('guardarYSeguir', () => void enviar(vehiculo === null), activo)

  return {
    valores: estado.valores,
    errores: estado.errores,
    conflicto: estado.conflicto,
    aviso: estado.aviso,
    esperandoConexion: estado.pendiente !== null,
    enLinea,
    enCurso: ediciones.enCurso,
    subasta: estado.subasta,
    aplicarSubasta,
    cambiar,
    enviar,
    // Antes de recargar la versión de otra persona: lo escrito se descarta a propósito.
    descartarBorrador: borrador.limpiar,
    // Lo escrito difiere de lo guardado (o de los valores por defecto de un alta): una salida desde un aviso lo perdería.
    hayCambios: JSON.stringify(estado.valores) !== JSON.stringify(iniciales),
  }
}

export type FormularioDeVehiculo = ReturnType<typeof useFormularioDeVehiculo>
