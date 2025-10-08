import { NextResponse } from "next/server";
import { assertAuthenticated } from "../../../../lib/authGuard";
import { getSSRClient } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getSb = () => getSSRClient();

/**
 * GET /api/liquidez/estado?cliente_id=X
 * Calcula el estado completo de liquidez usando las vistas optimizadas
 */
export async function GET(req) {
  const auth = await assertAuthenticated(req);
  if (!auth.ok) return auth.res;

  try {
    const sb = await getSb();
    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get("cliente_id");

    if (!clienteId) {
      return NextResponse.json(
        { success: false, error: "cliente_id es requerido" },
        { status: 400 }
      );
    }

    // 1. Obtener estado de liquidez desde la vista
    const { data: estadoData, error: estadoError } = await sb
      .from("v_estado_liquidez")
      .select("liquidez_total, liquidez_asignada, liquidez_disponible")
      .eq("cliente_id", clienteId)
      .single();

    // Si no hay datos, el cliente no tiene movimientos aún
    const estado =
      estadoError?.code === "PGRST116"
        ? { liquidez_total: 0, liquidez_asignada: 0, liquidez_disponible: 0 }
        : estadoData;

    if (estadoError && estadoError.code !== "PGRST116") {
      console.error("Error obteniendo estado de liquidez:", estadoError);
      return NextResponse.json(
        { success: false, error: estadoError.message },
        { status: 500 }
      );
    }

    // 2. Obtener fondos del cliente
    const { data: fondos, error: fondosError } = await sb
      .from("fondo")
      .select(`
        id_fondo,
        tipo_cartera_id,
        plazo,
        tipo_plazo,
        rend_esperado,
        deposito_inicial,
        fecha_alta,
        tipo_cartera:tipo_cartera_id(descripcion)
      `)
      .eq("cliente_id", clienteId);

    if (fondosError) {
      console.error("Error obteniendo fondos:", fondosError);
      return NextResponse.json(
        { success: false, error: fondosError.message },
        { status: 500 }
      );
    }

    // 3. Obtener estado de cada fondo desde la vista
    const fondosConEstado = await Promise.all(
      (fondos || []).map(async (fondo) => {
        const { data: estadoFondo, error: errorFondo } = await sb
          .from("v_estado_fondo")
          .select("liquidez_asignada, dinero_invertido, dinero_recuperado, saldo_disponible")
          .eq("cliente_id", clienteId)
          .eq("id_fondo", fondo.id_fondo)
          .single();

        // Si no hay datos, el fondo no tiene asignaciones aún
        const estadoFinal =
          errorFondo?.code === "PGRST116"
            ? {
                liquidez_asignada: 0,
                dinero_invertido: 0,
                dinero_recuperado: 0,
                saldo_disponible: 0,
              }
            : estadoFondo;

        const liquidezAsignada = parseFloat(estadoFinal?.liquidez_asignada || 0);
        const dineroInvertido = parseFloat(estadoFinal?.dinero_invertido || 0);

        return {
          id_fondo: fondo.id_fondo,
          tipo_cartera_id: fondo.tipo_cartera_id,
          tipo_cartera: fondo.tipo_cartera?.descripcion || "N/A",
          plazo: fondo.plazo,
          tipo_plazo: fondo.tipo_plazo,
          rend_esperado: fondo.rend_esperado,
          deposito_inicial: fondo.deposito_inicial,
          fecha_alta: fondo.fecha_alta,
          liquidezAsignada: liquidezAsignada,
          dineroInvertido: dineroInvertido,
          dineroRecuperado: parseFloat(estadoFinal?.dinero_recuperado || 0),
          saldoDisponible: parseFloat(estadoFinal?.saldo_disponible || 0),
          puedeComprar: parseFloat(estadoFinal?.saldo_disponible || 0) > 0,
          porcentajeInvertido:
            liquidezAsignada > 0
              ? parseFloat(((dineroInvertido / liquidezAsignada) * 100).toFixed(2))
              : 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        liquidezTotal: parseFloat(estado.liquidez_total || 0),
        liquidezAsignada: parseFloat(estado.liquidez_asignada || 0),
        liquidezDisponible: parseFloat(estado.liquidez_disponible || 0),
        fondos: fondosConEstado,
      },
    });
  } catch (e) {
    console.error("GET /api/liquidez/estado error:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Error al calcular estado de liquidez" },
      { status: 500 }
    );
  }
}