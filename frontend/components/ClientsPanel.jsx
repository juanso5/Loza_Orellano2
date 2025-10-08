'use client';
import { useEffect, useMemo, useState } from 'react';
import { useMovements } from '../components/MovementsProvider';
import ClientList from '../components/ClientList';

export default function ClientsPanel({ onSelectClient }) {
  const { clientIdFilter, setClientIdFilter, tick } = useMovements();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  // Recargar clientes cuando cambie tick (movimientos agregados/eliminados)
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      try {
        // Cargar clientes
        const resClientes = await fetch('/api/cliente', { cache: 'no-store' });
        if (!resClientes.ok) throw new Error('Error cargando clientes');
        const jsonClientes = await resClientes.json();
        const list = Array.isArray(jsonClientes?.data) ? jsonClientes.data : [];
        
        // Cargar fondos y movimientos para cada cliente
        const clientsWithData = await Promise.all(
          list.map(async (c) => {
            const clientId = Number(c.id ?? c.id_cliente ?? 0);
            
            // Cargar fondos del cliente
            const resFondos = await fetch(`/api/fondo?cliente_id=${clientId}`, { cache: 'no-store' });
            const jsonFondos = await resFondos.json();
            const portfolios = Array.isArray(jsonFondos?.data) ? jsonFondos.data : [];
            
            // Cargar movimientos del cliente
            const resMovs = await fetch(`/api/movimiento?cliente_id=${clientId}&limit=10000`, { cache: 'no-store' });
            const jsonMovs = await resMovs.json();
            const movements = Array.isArray(jsonMovs?.data) ? jsonMovs.data : [];
            
            return {
              id: clientId,
              name: c.name || c.nombre || '',
              portfolios,
              movements,
            };
          })
        );
        
        if (!ignore) setClients(clientsWithData);
      } catch (e) {
        console.error('Error cargando datos de clientes:', e);
        if (!ignore) setClients([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, [tick]); // Recargar cuando cambien movimientos

  const filtered = useMemo(() => {
    const s = (q || '').toLowerCase();
    if (!s) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(s));
  }, [clients, q]);

  return (
    <aside className="card clients-column" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="card-header" style={{ padding: 12, borderBottom: '1px solid #eef2f6' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente…"
            className="search-input"
            style={{ flex: 1, minWidth: 0 }}
          />
          {clientIdFilter != null && (
            <button
              className="btn-small"
              onClick={() => setClientIdFilter(null)}
              title="Quitar filtro"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: 12 }}>
        {loading ? (
          <div className="muted">Cargando clientes…</div>
        ) : filtered.length === 0 ? (
          <div className="muted">Sin resultados</div>
        ) : (
          <ClientList
            clients={filtered}
            searchQuery={q}
            selectedClientId={clientIdFilter ?? null}
            onSelectClient={(id) => {
              setClientIdFilter(id);
              onSelectClient?.(id);
            }}
          />
        )}
      </div>
    </aside>
  );
}