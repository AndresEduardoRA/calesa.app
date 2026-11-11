## 2026-11-11 — Paso 7.07-1: el calendario de lectura de `/agenda`

- **D1 · La semana empieza el lunes.** Es lo que se usa en el país de la zona por defecto; es una constante (`PRIMER_DIA_DE_LA_SEMANA`) de `entities/calendario`.
- **D2 · El mes en el celular es una lista por día,** sólo con los días que tienen algo, no la grilla (la recomendada de la fila). Mes y semana comparten `ListaPorDia`.
- **D3 · El celular abre en «día»** por el ancho de la petición (`anchoDeEstaPeticion()` contra `CORTE_DE_LA_TABLA`) y el escritorio en «mes»; `?vista=` manda.
- **D4 · «Hoy» y los cortes de día son los de la zona de la empresa** (`ajustes_empresa.zona_horaria`, `ZONA_POR_DEFECTO` si falla). El rango que se pide a la base se
  arma con `inicioDelDia(primerDía)` y `inicioDelDia(díaSiguiente(últimoDía))`: un día con cambio de horario dura 23 o 25 h (lo prueba el 25 de oct de 2026 en Madrid).
- **D5 · `?de=todos` sin `agenda.ver_todo` se ignora** (la base volvería a exigirlo) y el interruptor «Ver la de todos» no se dibuja: es un filtro de lectura, no una acción.
- **D6 · Colores por clase con tokens existentes:** evento `info`, tarea `positivo`, recordatorio `aviso`, subasta `visitado`; el chip dice su clase con texto.
- **D7 · El error de lectura sube al `error.tsx` de `(app)`** con «Reintentar» (`datosO`), como el resto de las pantallas de lectura.
- **D8 · Calendario propio con CSS grid y `date-fns`/`Intl`:** ninguna librería nueva. El título del rango sale de `Intl` en español; ningún mes escrito en el código.
- **D9 · En esta parte evento, tarea y recordatorio no son enlaces** (sus paneles llegan en 7.07-2 y 7.07-3); sólo la subasta navega, a `/vehiculos/<id>`.
- **D10 · El título es el `<h1>` y las cuatro clases del filtro son botones de alternar con texto** (`aria-pressed`); sin ninguna elegida se vuelve a «todas».
- **D11 · `Agenda` aparece en la barra lateral de todos** (`permisos: null`): `navegacion.test.ts` ahora espera `['inicio', 'agenda']` sin permisos.
- **D12 · El «+N más» de una celda cuenta lo cargado:** si una clase llegó al tope (`hay_mas`), dice «+N+ más» y al pie sale el `AvisoDeTope` con «Ver el día».
- **D13 · Los números de `?ver=` van como un solo `parseAsString`** con la lista separada por comas (no `parseAsArrayOf`: ningún uso existente en el repo); `leerClases` ignora lo desconocido.
