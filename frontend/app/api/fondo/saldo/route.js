// app/api/fondo/saldo/route.js
import { NextResponse } from "next/server";
import { assertAuthenticated } from "../../../../lib/authGuard";
import { getSSRClient } from "../../../../lib/supabaseServer";
import {
  calcularSaldoFondo,
  calcularSaldosTodosLosFondos,
  calcularRendimientoFondo,
  obtenerResumenFondo
} from "../../../../lib/fondoHelpers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const getSb = () => getSSRClient();
/**
 * GET /api/fondo/saldo
 * 
 * Query params:
 * - cliente_id: ID del cliente (requerido)
 * - fondo_id: ID del fondo espec├¡fico (opcional)
 * - action: "saldo" | "rendimiento" | "resumen" | "todos" (default: "saldo")
 * - incluir_precios_mercado: "true" | "false" (default: "false")
 */
export async function GET(req) {
  const auth = await assertAuthenticated(req);
  if (!auth.ok) return auth.res;
  try {
    const sb = await getSb();
    const { searchParams } = new URL(req.url);
    const clienteId = parseInt(searchParams.get("cliente_id"));
    const fondoId = searchParams.get("fondo_id") ? parseInt(searchParams.get("fondo_id")) : null;
    const action = searchParams.get("action") || "saldo";
    const incluirPreciosMercado = searchParams.get("incluir_precios_mercado") === "true";
    // Validar cliente_id
    if (!clienteId || isNaN(clienteId)) {
      return NextResponse.json(
        { error: "cliente_id es requerido y debe ser un n├║mero v├ílido" },
        { status: 400 }
      );
    }
    // Verificar que el cliente existe
    const { data: clienteData, error: clienteError } = await sb
      .from("cliente")
      .select("id_cliente, nombre")
      .eq("id_cliente", clienteId)
      .single();
    if (clienteError || !clienteData) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }
    // Si se especifica fondo_id, verificar que existe y pertenece al cliente
    if (fondoId) {
      const { data: fondoData, error: fondoError } = await sb
        .from("fondo")
        .select("id_fondo, cliente_id")
        .eq("id_fondo", fondoId)
        .single();
      if (fondoError || !fondoData) {
        return NextResponse.json(
          { error: "Fondo no encontrado" },
          { status: 404 }
        );
      }
      if (Number(fondoData.cliente_id) !== clienteId) {
        return NextResponse.json(
          { error: "El fondo no pertenece al cliente especificado" },
          { status: 403 }
        );
      }
    }
    // Procesar seg├║n la acci├│n solicitada
    let resultado;
    switch (action) {
      case "saldo":
        if (fondoId) {
          // Saldo de un fondo espec├¡fico
          resultado = await calcularSaldoFondo(sb, clienteId, fondoId);
        } else {
          // Saldos de todos los fondos del cliente
          resultado = await calcularSaldosTodosLosFondos(sb, clienteId);
        }
        break;
      case "rendimiento":
        if (!fondoId) {
          return NextResponse.json(
            { error: "fondo_id es requerido para calcular rendimiento" },
            { status: 400 }
          );
        }
        resultado = await calcularRendimientoFondo(sb, clienteId, fondoId, incluirPreciosMercado);
        break;
      case "resumen":
        if (!fondoId) {
          return NextResponse.json(
            { error: "fondo_id es requerido para obtener resumen" },
            { status: 400 }
          );
        }
        resultado = await obtenerResumenFondo(sb, clienteId, fondoId);
        break;
      case "todos":
        // Obtener saldos de todos los fondos
        resultado = await calcularSaldosTodosLosFondos(sb, clienteId);
        break;
      default:
        return NextResponse.json(
          { error: `Acci├│n desconocida: ${action}` },
          { status: 400 }
        );
    }
    return NextResponse.json({
      data: resultado,
      cliente: {
        id: clienteData.id_cliente,
        nombre: clienteData.nombre
      },
      metadata: {
        action,
        fondoId,
        incluirPreciosMercado,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: "Error al procesar la solicitud",
        detalles: error.message 
      },
      { status: 500 }
    );
  }
}
