import { NextResponse } from "next/server";
import { getSSRClient } from "@/lib/supabaseServer";
import {
  calcularValorEspecies,
  calcularLiquidezFondo,
  obtenerFlujosPeriodo,
  calcularTWRPeriodo,
} from "@/lib/rendimientoHelpers";

/**
 * GET /api/rendimiento
 * Calcula rendimientos de fondos por cliente y período
 * 
 * Query params:
 * - cliente_id: ID del cliente (requerido)
 * - fecha_inicio: Fecha inicio período (YYYY-MM-DD, requerido)
 * - fecha_fin: Fecha fin período (YYYY-MM-DD, requerido)
 * 
 * Retorna:
 * {
 *   success: true,
 *   data: {
 *     resumen: {
 *       fondosActivos: number,
 *       valorTotal: number,
 *       flujosNetos: number,
 *       rendimientoPromedio: number
 *     },
 *     fondos: [{
 *       id: number,
 *       nombre: string,
 *       estrategia: string,
 *       valorInicial: number,
 *       valorFinal: number,
 *       liquidezInicial: number,
 *       liquidezFinal: number,
 *       flujos: { depositos, extracciones, neto },
 *       twr: number,
 *       ganancia: number
 *     }]
 *   }
 * }
 */
export async function GET(request) {
  try {
    const supabase = await getSSRClient();
    const { searchParams } = new URL(request.url);
    
    const clienteId = searchParams.get("cliente_id");
    const fechaInicio = searchParams.get("fecha_inicio");
    const fechaFin = searchParams.get("fecha_fin");

    // Validaciones
    if (!clienteId) {
      return NextResponse.json(
        { success: false, error: "cliente_id es requerido" },
        { status: 400 }
      );
    }

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json(
        { success: false, error: "fecha_inicio y fecha_fin son requeridas" },
        { status: 400 }
      );
    }

    // Validar formato de fechas
    const fechaInicioDate = new Date(fechaInicio);
    const fechaFinDate = new Date(fechaFin);
    
    if (isNaN(fechaInicioDate.getTime()) || isNaN(fechaFinDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Formato de fecha inválido (usar YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    if (fechaInicioDate > fechaFinDate) {
      return NextResponse.json(
        { success: false, error: "fecha_inicio debe ser anterior a fecha_fin" },
        { status: 400 }
      );
    }

    // 1. Obtener fondos del cliente
    const { data: fondos, error: fondosError } = await supabase
      .from("fondo")
      .select("id_fondo,fecha_alta,tipo_cartera:tipo_cartera_id(id_tipo_cartera,descripcion,categoria)")
      .eq("cliente_id", clienteId);

    if (fondosError) {
      console.error("Error obteniendo fondos:", fondosError);
      return NextResponse.json(
        { success: false, error: "Error al obtener fondos del cliente" },
        { status: 500 }
      );
    }

    if (!fondos || fondos.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          resumen: {
            fondosActivos: 0,
            valorTotal: 0,
            flujosNetos: 0,
            rendimientoPromedio: 0,
          },
          fondos: [],
        },
      });
    }

    // 2. Calcular rendimientos para cada fondo
    const fondosConRendimiento = [];
    let sumaValorFinal = 0;
    let sumaFlujosNetos = 0;
    let sumaTWR = 0;
    let fondosConTWR = 0;

    for (const fondo of fondos) {
      const fondoId = fondo.id_fondo;
      
      try {
        console.log(`[Rendimiento] Calculando para fondo ${fondoId}...`);
        
        // Calcular valores actuales (final del período)
        console.log(`[Rendimiento] Calculando valor especies...`);
        const valorEspecies = await calcularValorEspecies(supabase, fondoId);
        console.log(`[Rendimiento] Valor especies: ${valorEspecies}`);
        
        console.log(`[Rendimiento] Calculando liquidez...`);
        const liquidezActual = await calcularLiquidezFondo(supabase, fondoId);
        console.log(`[Rendimiento] Liquidez actual: ${liquidezActual}`);
        
        const valorFinal = valorEspecies + liquidezActual;
        console.log(`[Rendimiento] Valor final: ${valorFinal}`);

        // Obtener flujos del período
        console.log(`[Rendimiento] Obteniendo flujos del período...`);
        const flujos = await obtenerFlujosPeriodo(
          supabase,
          fondoId,
          fechaInicioDate,
          fechaFinDate
        );

        // Calcular valor inicial (restando flujos del valor final)
        // Este es un cálculo aproximado - idealmente deberíamos tener snapshots históricos
        const valorInicial = valorFinal - flujos.neto;

        // Calcular TWR solo si hay valor inicial positivo
        let twr = 0;
        if (valorInicial > 0) {
          twr = calcularTWRPeriodo(valorInicial, valorFinal, flujos.neto);
          sumaTWR += twr;
          fondosConTWR++;
        }

        const ganancia = valorFinal - valorInicial - flujos.neto;

        fondosConRendimiento.push({
          id: fondoId,
          nombre: fondo.tipo_cartera?.descripcion || `Fondo ${fondoId}`,
          estrategia: fondo.tipo_cartera?.categoria || "general",
          valorInicial,
          valorFinal,
          liquidezInicial: Math.max(0, liquidezActual - flujos.neto), // Aproximación
          liquidezFinal: liquidezActual,
          especiesValor: valorEspecies,
          flujos: {
            depositos: flujos.depositos,
            extracciones: flujos.extracciones,
            neto: flujos.neto,
          },
          twr: Math.round(twr * 100) / 100, // Redondear a 2 decimales
          ganancia: Math.round(ganancia * 100) / 100,
          fechaAlta: fondo.fecha_alta,
        });

        sumaValorFinal += valorFinal;
        sumaFlujosNetos += flujos.neto;
      } catch (error) {
        console.error(`[Rendimiento] Error calculando rendimiento para fondo ${fondoId}:`, error);
        console.error(`[Rendimiento] Stack:`, error.stack);
        // Continuar con el siguiente fondo
      }
    }

    // 3. Calcular resumen
    const resumen = {
      fondosActivos: fondosConRendimiento.length,
      valorTotal: Math.round(sumaValorFinal * 100) / 100,
      flujosNetos: Math.round(sumaFlujosNetos * 100) / 100,
      rendimientoPromedio:
        fondosConTWR > 0
          ? Math.round((sumaTWR / fondosConTWR) * 100) / 100
          : 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        resumen,
        fondos: fondosConRendimiento,
      },
    });
  } catch (error) {
    console.error("Error en GET /api/rendimiento:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
