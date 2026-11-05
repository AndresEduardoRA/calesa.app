// El máximo de filas por página del listado `/cotizaciones` (el selector ofrece hasta acá): medido con 250.000 cotizaciones en
// `supabase/tests/medir-cotizaciones-listado.sql` (`docs/RENDIMIENTO.md`). `cotizaciones_listado()` lo escribe igual en su `_acotar_pagina`.
export const MAXIMO_DE_PAGINA_DE_COTIZACIONES = 100
