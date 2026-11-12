# Paso 5.12-2 — «Revisar», la franja sobre el flujo

5.12-2 cierra el paso 5.12: el PR marca `integrado 5.12`.

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas ni preguntas abiertas. El plan: `.piloto/planes/5.12-2.md`.

- **D1** El resumen cuenta errores y avisos; las de información no entran («Todo en orden» con sólo información, que se ve al abrir). No alarma por lo que
  no es un problema; reversible.
- **D2** La franja nace cerrada **siempre**, también con un error (cambia lo que proponía la 5.12-1): todo flujo recién creado tiene `sin_inicial` y la
  franja abierta empujaría la lista en cada visita; el resumen ya dice «1 error» con su icono. Reversible.
- **D3** La palabra del nivel `info` es «Información», no «Sugerencia» (cambia la 5.12-1): `entrada_no_automatica` y `sin_bloqueantes` describen, no
  proponen un cambio.
- **D4** Lectura por Server Action desde el hueco de cliente (sólo recibe `{flujo}`), releída por `flujo.version` y conservando lo leído mientras relee;
  sin `memoriaDeLectura` (el resultado cambia con cada guardado).
- **D5** Tope de 200 avisos con `<AvisoDeTope>` (un flujo tiene decenas de fases; `escala.md` › «Lo que se dibuja tiene tope»).
- **D6** Un aviso abre su fase con un botón que llama `useFaseAbierta().abrir()`, no un `<Link>`: suma al historial igual, conserva la query y devuelve el
  foco; un enlace con nombres de fase chocaría con los locators de los specs vecinos.
- **D7** Permiso de la action por ámbito sin origen, como las demás lecturas del módulo; el origen lo decide la base, que da cero filas.
- **D8** Un aviso sin fase (`sin_inicial`, varias iniciales) o con una fase fuera de las leídas va sin botón.
- **D9** La sección de `docs/UX.md` va en el commit de la franja y no en el de docs: la guarda del mapa exige que el título que cita el spec exista en el
  árbol al commitear.
