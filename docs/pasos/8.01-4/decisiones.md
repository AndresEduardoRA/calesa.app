# 8.01-4: decisiones (2026-11-12)

- **D1 · El formulario de «Ajustes» viaja diferido** (`diferido()`, `features/sitio/ajustes/components/diferidos.tsx`). `pestanas.ts` importa el hueco para saber
  si está lleno y el hub (`secciones.ts`) importa `pestanas.ts`: con el componente directo, el formulario y su action entrarían al grafo de `/configuracion`. La
  pestaña no se dibuja en el servidor; mientras llega el código, `<EsqueletoFormulario bloques={3} campos={4} />`. Reversible.
- **D2 · El conteo de lo que deja de verse sale de la vista pública `web.vehiculos`**, filtrada por `origen_nombre` (único) con `limit 51`: sin RPC, sin
  migración, sin permiso nuevo. Es lo que ve un visitante, así que incluye «web activa»: con la web apagada no deja de verse nada y no hay aviso.
- **D3 · El conteo se lee al abrir la pestaña**, uno por origen que hoy se ve, en paralelo. Si uno falla, ese origen avisa sin número y la pestaña sigue en pie.
- **D4 · El aviso sale bajo la casilla al destildar un origen que hoy se ve**, antes de guardar y sin confirmación (guardar es reversible). Con 0 vehículos no avisa.
- **D5 · Un origen visible que no aparece en la lista (inactivo) se conserva al guardar** (`origenesAGuardar`): no se cae de la web sin que nadie lo vea.
- **D6 · Se mandan todas las claves del sitio que edita la pestaña**, no sólo las cambiadas; la versión frena el pisotón, y `redes` y `seo` se reemplazan
  enteras de todos modos. Nunca `legales` ni la política de la cola.
- **D7 · El conflicto (`PT409`) va con `<AvisoDeConflicto>` dentro del formulario**, con el texto de la base. «Recargar» borra el borrador y hace
  `router.refresh()`: la versión nueva cambia la `key` y el formulario se vuelve a montar desde la base. Un error 22023 de la base va junto a su campo (por el
  `hint`); los demás, por toast.
- **D8 · El borrador** (`useBorrador('ajustes-del-sitio')`) **guarda sólo los 13 campos de texto**; las casillas y el interruptor arrancan de lo guardado. Sin
  modo de sólo lectura: la página sólo abre la pestaña con `web.ajustes.gestionar`.
- **D9 · Textos** (reversibles): bloques «Identidad», «Contacto», «Vitrina» (abiertos), «Redes» y «Buscadores» (plegados, se abren con un error); éxito
  «Ajustes del sitio guardados»; sin orígenes «Todavía no hay orígenes activos.»; los mensajes de validación son los de la base, palabra por palabra.
- **D10 · `docs/UX.md` no se toca** en esta parte. Estados de la pestaña, para que el carril `a` sume la fila: cargando (el `fallback` de la página y el
  esqueleto del diferido); error al leer (el `error.tsx` con «Reintentar»); sin permiso (la página, 8.01-3); vacío (no aplica a la fila única; la lista de
  orígenes tiene su texto); sin red (el aviso «No hay conexión…» y `conRed`); conflicto (D7).
