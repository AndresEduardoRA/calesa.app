// Fuera de un archivo `'use client'`: las lee también quien monta el panel sin cargar su código.
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { CLAVE_DE_BUSQUEDA, CLAVE_DE_CLASE } from '../panel-para-cotizar/claves'

// Las claves de la URL de la búsqueda del panel «Vincular a un lead»: quien lo cierra o lo vuelve a abrir las limpia junto con las suyas.
export const CLAVES_DE_LA_BUSQUEDA = [CLAVE_DE_CLASE, CLAVE_DE_BUSQUEDA, CLAVE_DE_CURSOR] as const
