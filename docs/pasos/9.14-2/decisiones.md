# 9.14-2 · El cierre de la Fase 9, parte 2 de 3: el recorrido con dos cuentas (2026-11-13)

- **D1 · El recorrido corre sólo en `escritorio`**, con `// @sin-celular-archivo:` y su motivo: encadena tablero, actividad, datos y el dinero
  de la unidad, pantallas que sus propios specs ya marcan como de escritorio, y las cuatro tareas de oro en el celular las midió el 9.14-1.
- **D2 · Los tramos se recorren con clics, no con el teclado.** Lo que mide teclas y KLM es la tarea de oro 2 (`cotizar-tarea-de-oro-recorrido`);
  acá lo que se prueba es que la cadena entera cierra, y el camino con el ratón es más corto y menos frágil. Tampoco se baja el PDF (ya lo
  prueba `cotizar-pdf.spec.ts`).
- **D3 · Los lectores privados de otros specs se copian, no se extraen.** Las cifras del tablero, el doble de `beforeinstallprompt`, la barra
  del cliente de la hoja y el lector del CSV viven privados en `tablero.spec.ts`, `pwa.spec.ts`, `cotizar-recorrido.ts` y
  `datos-exportar.spec.ts`: se copiaron a `e2e/soporte/fase-9-pasos.ts` con la cita de dónde salieron. En un cierre de fase no se tocan specs
  verdes por una refactorización, y el repo ya tiene ese precedente (`formato` está duplicado en dos specs).
- **D4 · La asesora lleva un rol propio, no el `asesor` de la semilla.** Ése no trae `actividad.ver`, `logistica.pagos.editar` ni
  `cotizaciones.final.gestionar`, que el recorrido necesita. Lo que sí queda fuera a propósito es `logistica.pagos.confirmar`: confirmar un
  pago tiene que ser de la otra cuenta (R4), que es lo que el tramo prueba.
- **D5 · El vehículo se asegura con fase.** `cargarVehiculos` inserta sin fase y la inicial la decide `_vehiculo_fase_de_entrada`: el terreno
  lee `fase_id` después de cargar y la fija si quedó nula, y falla claro si no pudo. Sin fase, el panel de la unidad (R4) no abre.
- **D6 · Las cifras del tablero se afirman por su aumento, con `≥`, no por un total.** Otros specs convierten leads y confirman pagos el mismo
  mes (`CLAUDE.md`: «un número que se muestra nunca es un total exacto»). El antes se lee en R3, antes de la final y del pago.
- **D7 · Cambiar de cuenta dentro de una prueba suelta las cookies primero.** `/ingreso` con una sesión viva no dibuja el formulario (lleva a
  Inicio) y `entrar(…, { fresco: true })` se quedaba esperando «Correo» hasta el timeout. El ayudante `cambiarDeCuenta` hace
  `context.clearCookies()` y después entra, como ya hacía `tablero.spec.ts`.
- **D8 · El marcador de la bitácora va en una sola línea** (como el 9.14-1): partido en dos, `scripts/piloto/cuenta-e2e.mjs` no lo reconoce.
- **D9 · Tres corridas seguidas en verde antes de commitear, no dos.** Es un spec en serie, largo, con dos cuentas y nueve pantallas: el
  candidato número uno a quedar inestable, y una fase no se cierra con un inestable nuevo.
- **D10 · El inestable de `leads-alta.spec.ts` que anotó el 9.14-1 no se toca.** La regla de inestables (`.claude/rules/e2e.md`) pide dos
  caídas en noches seguidas del completo; lo mirará el Nivel 3 de la 9.14-3.
- **D11 · Actuar sobre un lead exige estar en su cartera; el recorrido se acomodó a eso, no al revés.** `puede_actuar_lead` pide
  `en_cartera(lead)`, así que marcar final (`cotizacion_marcar_final`) y editar la ficha no los puede hacer la dueña sobre un lead que registró
  su asesora, aunque tenga `leads.editar` con alcance «todos». El plan de la parte 1 suponía lo contrario. Es la regla del producto, no un
  defecto: la final y el cambio de nombre los hace la asesora, y la dueña hace lo que sí es suyo (confirmar el pago, el tablero, la actividad,
  exportar e importar). No se cambió ninguna policy ni ningún permiso para que el recorrido pasara.
- **D12 · El «nunca» de la actividad se afirma como recorte del detalle, no como ausencia de la fila.** Un lead ajeno le muestra a la asesora
  quién y cuándo, con los campos en «Sin acceso al detalle» y sin botón para abrir el diff. Afirmar eso es más fuerte que afirmar que no ve
  nada, y es lo que la base realmente hace (`_actividad_puede_ver_fila`).
- **D13 · «Importar en una base limpia» = borrar el lead del recorrido y traerlo del archivo exportado, con el teléfono que tipeó R1.** Volver
  a subir el archivo tal cual no puede funcionar: el CSV trae el lead de la asesora con el teléfono enmascarado, que es justo lo que promete el
  9.05. R7 afirma la máscara y el «Dueño» en el archivo antes de borrarlo, y usa los encabezados de ese mismo archivo para importar. El
  `db:reset` de verdad lo da el completo de la 9.14-3: el piloto no resetea la base a mitad de una corrida.
