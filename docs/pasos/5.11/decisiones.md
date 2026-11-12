## 2026-11-11 — Paso 5.11: «Reglas» y la oferta de transporte

- **D1 · Puertos y navieras sólo se leen** (los activos, `limit 201`, corte a 200 con `<AvisoDeTope>`). Su gestión es de la Fase 6 (`logistica`, con
  `logistica.catalogos.gestionar`); la pantalla dice «Todavía no hay navieras cargadas. Se cargan en Logística.».
- **D2 · La action de apagar pregunta el impacto antes de escribir.** Con uso devuelve `en_uso` sin llamar a `flujo_regla_cambiar`; si el uso llega entre
  la pregunta y la escritura, el `23514` se vuelve a preguntar al impacto y se dice igual. La pantalla no precarga el impacto de 10 reglas.
- **D3 · Encender también ofrece «Deshacer»**, por el mismo camino (puede dar `en_uso`). El toast dice «Regla «Aduana» apagada.», sin género propio
  de cada nombre.
- **D4 · «Deshacer» usa la última versión conocida del flujo** (la de la página o la de la última respuesta): apagar A y B y deshacer A no da `PT409` por
  culpa de la propia persona. Si otra persona tocó el flujo, el conflicto sale igual, dentro de la pantalla.
- **D5 · Los interruptores siguen a lo que lee el servidor** y se apagan mientras hay un envío en vuelo: un apagado que no se hace no «salta» y vuelve.
- **D6 · El permiso se dice con `motivoSinPermisoDeReglas`** (pantalla: interruptores y casillas apagados con el motivo; action: primera llave); la base
  decide. El selector ya sólo ofrece flujos configurables, así que el caso real es un `42501`.
- **D7 · El borrador de la oferta lleva `key` por la firma de lo guardado** (ids ordenados), no por la versión: encender o apagar otra regla no borra lo
  que se está marcando.
- **D8 · Una regla encendida que el ámbito no admite** (dato heredado) se muestra con su interruptor, nunca se esconde (`reglasParaMostrar`).
- **D9 · Un puerto o naviera guardado que se desactivó** se sigue mostrando, rotulado «(inactivo)», para poder quitarlo (la base los acepta).
- **D10 · «Vacío: se ofrecen todos.»** sólo se dice en un grupo que tiene algo para marcar; un grupo sin catálogo dice «Todavía no hay … cargad[o]s.».
- **D11 · Una sola parte** (el plan estimaba dos): pantalla pura sobre RPC con sus pruebas; la sección de `docs/UX.md` entró en el commit de la pestaña
  porque el e2e la cita y el hook de commit exige que el título exista.
