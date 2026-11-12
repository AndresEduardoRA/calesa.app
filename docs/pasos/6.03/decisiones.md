# Paso 6.03 — La cadena de `/logistica`

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas: las dudas del PLAN, con su recomendada. El plan completo: `.piloto/planes/6.03.md`.

- **D1** La tarjeta no lleva foto: se reconoce por nombre, VIN, lote o contenedor y 350 miniaturas pesan.
- **D2** Con muchas fases la caja se desplaza de costado con `<PistaDeDesborde>`; no se pliegan columnas.
- **D3** «Sin fase» la pone la base (primera y sólo con tarjetas); el texto lo pone la interfaz. El kanban no ordena: el orden de las columnas es el de la base.
  Su cursor de «Ver más» va sólo por `id` (sin `fase_desde`, por `vehiculos_fase_desde_coherente`): `cursorDeLaColumna()`.
- **D4** La tarjeta se nombra `<principal> · <título>` (6.13) y se arma **en el servidor**: los atributos se leen de `vehiculos` bajo la RLS de quien mira, sólo si el
  origen tiene campo principal, por clave primaria y en tandas de ≤ 100 ids. Si falla o no llegan atributos, la tarjeta dice el título; no tumba el tablero.
  Una sola lectura del principal y de los ajustes por cadena, no por columna.
- **D5** «Ver más» es una Server Action de lectura (`verMasDeLaColumna`): así la identidad se arma igual que en la primera carga. Pide `logistica.ver` del origen
  antes de leer; la base lo vuelve a exigir. Un `22023` (cursor, fase ajena) se dice «No se pudo cargar más. Intenta de nuevo.».
- **D6** Hasta `TOPE_DE_LO_CARGADO` (500) por columna; al llegar, `<AvisoDeTope>`. El número de la columna es `conteoCorto()` («50+»), nunca un total.
- **D7** «Demoradas» y «Por aprobar» son una `eleccion` de dos valores y no un `booleano` (un «No» tri-estado no filtra y el chip sería engañoso); sólo se manda a la
  base lo que es `si`. La búsqueda `q` pide 3 letras o números (espejo de `_logistica_filtros`); `naviera` sólo se ofrece si hay navieras activas.
- **D8** Las pestañas de origen son los activos con `logistica.ver` y la regla `logistica` activa en su flujo; un `?origen=` ajeno cae en el primero. Un origen
  cuyo flujo no se pudo leer queda fuera y se cuenta (`fallaron`).
- **D9** a **D12** (parte 2): abrir una tarjeta es un enlace con `vehiculo=<id>`; celular, una fase a la vez con `?fase=`; «dónde está» la arma el servidor;
  el presupuesto de JS de `/logistica` se mide con el build.
- **D13** `navegacion.ts` ya tenía «Logística» disponible: `_shell` no se toca. El kanban no entra a `listas-con-patron.ts` (sólo vigila tablas).
- **D14** (parte 1) Las tres RPC entran a `RPC_PAGINADAS_DEL_NUCLEO` de `scripts/guardas/paginas-en-la-base.ts` (es del A): la cadena y su columna piden
  `TAMANO_DE_COLUMNA`; «dónde está», 10.
- **D14** (parte 2) Los e2e de 6.01 que afirmaban «La cadena llega con el próximo paso.» (`logistica-unidad.spec.ts`) afirman ahora la región de la fase sembrada («<fase>: 1 vehículo»): es consecuencia del cambio de texto, no un arreglo para que pasen.
- **D15** (parte 2) Cada tarjeta es un `<Link>` con `prefetch={false}`: un clic común abre el panel por nuqs sumando al historial (`useAbrirLaUnidad`, copiado al área `cadena`), y con Ctrl, Mayús, Alt o Meta el navegador abre la URL con `vehiculo=` en otra pestaña. El foco va a la primera tarjeta nueva tras «Ver más» y se anuncia «Se cargaron N más.».
- **D16** (parte 2) `/logistica` entra al presupuesto de JS con 410 KB (medido 388,9 KB en 30 chunks, más un 5 % a la decena). El e2e siembra tres orígenes: A (tres fases, cinco vehículos), B (una fase con 51) y C (vecino sin permiso).
