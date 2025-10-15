import { NextResponse } from "next/server";
import { assertAuthenticated } from "../../../../../lib/authGuard";
import { getSSRClient } from "../../../../../lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getSb = () => getSSRClient();

/**
 * GET /api/fondo/[id]/tenencias
 * Obtiene las tenencias actuales (especies) de un fondo con valorización
 */
export async function GET(req, { params }) {
  const auth = await assertAuthenticated(req);
  if (!auth.ok) return auth.res;

  try {
    const sb = await getSb();
    const resolvedParams = await params;
    const fondoId = resolvedParams.id;

    if (!fondoId) {
      return NextResponse.json(
        { success: false, error: "fondo_id es requerido" },
        { status: 400 }
      );
    }

    // Obtener tenencias valoradas del fondo
    const { data: tenencias, error: tenenciasError } = await sb
      .from("v_tenencias_valoradas")
      .select("*")
      .eq("fondo_id", fondoId)
      .order("valor_total_usd", { ascending: false });

    if (tenenciasError) {
      console.error("Error obteniendo tenencias:", tenenciasError);
      return NextResponse.json(
        { success: false, error: tenenciasError.message },
        { status: 500 }
      );
    }

    // Calcular resumen
    const resumen = {
      valor_total_usd: 0,
      ganancia_perdida_usd: 0,
      total_especies: 0,
      especies_con_precio: 0,
      especies_sin_precio: 0,
    };

    for (const t of tenencias || []) {
      resumen.valor_total_usd += Number(t.valor_total_usd || 0);
      resumen.ganancia_perdida_usd += Number(t.ganancia_perdida_usd || 0);
      resumen.total_especies += 1;
      
      if (t.precio_actual !== null && t.precio_actual > 0) {
        resumen.especies_con_precio += 1;
      } else {
        resumen.especies_sin_precio += 1;
      }
    }

    // Calcular rendimiento promedio ponderado
    if (resumen.valor_total_usd > 0) {
      resumen.rendimiento_promedio = (
        (resumen.ganancia_perdida_usd / 
        (resumen.valor_total_usd - resumen.ganancia_perdida_usd)) * 100
      );
    } else {
      resumen.rendimiento_promedio = 0;
    }

    // Mapear datos para asegurar tipos correctos
    const tenenciasFormateadas = (tenencias || []).map((t) => ({
      fondo_id: Number(t.fondo_id),
      tipo_especie_id: Number(t.tipo_especie_id),
      especie_nombre: t.especie_nombre || "Sin nombre",
      cantidad_actual: Number(t.cantidad_actual || 0),
      precio_promedio_compra: t.precio_promedio_compra 
        ? Number(t.precio_promedio_compra) 
        : null,
      total_movimientos: Number(t.total_movimientos || 0),
      ultima_operacion: t.ultima_operacion,
      primera_operacion: t.primera_operacion,
      precio_actual: t.precio_actual ? Number(t.precio_actual) : null,
      fecha_precio: t.fecha_precio,
      valor_total_usd: Number(t.valor_total_usd || 0),
      rendimiento_porcentaje: t.rendimiento_porcentaje 
        ? Number(t.rendimiento_porcentaje) 
        : 0,
      ganancia_perdida_usd: Number(t.ganancia_perdida_usd || 0),
    }));

    return NextResponse.json({
      success: true,
      data: {
        tenencias: tenenciasFormateadas,
        resumen: {
          valor_total_usd: Number(resumen.valor_total_usd.toFixed(2)),
          ganancia_perdida_usd: Number(resumen.ganancia_perdida_usd.toFixed(2)),
          rendimiento_promedio: Number(resumen.rendimiento_promedio.toFixed(2)),
          total_especies: resumen.total_especies,
          especies_con_precio: resumen.especies_con_precio,
          especies_sin_precio: resumen.especies_sin_precio,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/fondo/[id]/tenencias error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al obtener tenencias del fondo",
      },
      { status: 500 }
    );
  }
}
