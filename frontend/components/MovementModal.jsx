'use client';
import { useEffect, useState, useMemo } from 'react';
import { useMovements } from './MovementsProvider';

function toISODateTimeLocal(val) {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function MovementModal({ open, onClose, defaultClientId }) {
  const { refreshFirstPage, setClientIdFilter } = useMovements();

  // Datos para selects
  const [clients, setClients] = useState([]);
  const [funds, setFunds] = useState([]);

  // Estado del formulario
  const [clienteId, setClienteId] = useState(null);
  const [fondoId, setFondoId] = useState(null);
  const getDefaultFecha = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };
  const [fecha, setFecha] = useState(getDefaultFecha());
  const [tipo, setTipo] = useState('Ingreso'); // Ingreso | Egreso
  const [especieSel, setEspecieSel] = useState('');
  const [especieNueva, setEspecieNueva] = useState('');
  const [nominal, setNominal] = useState('');
  const [precioUsd, setPrecioUsd] = useState('');

  const [loading, setLoading] = useState(false);

  // Resetear formulario cuando se abre
  useEffect(() => {
    if (open) {
      setFecha(getDefaultFecha());
      setTipo('Ingreso');
      setEspecieSel('');
      setEspecieNueva('');
      setNominal('');
      setPrecioUsd('');
      setFondoId(null);
      if (defaultClientId) {
        setClienteId(defaultClientId);
      }
    }
  }, [open, defaultClientId]);

  // Cargar clientes al abrir
  useEffect(() => {
    if (!open) return;
    let ignore = false;
    (async () => {
      try {
        const res = await fetch('/api/cliente', { cache: 'no-store' });
        if (!res.ok) throw new Error();
        const j = await res.json();
        const list = Array.isArray(j?.data) ? j.data : [];
        const norm = list.map((c) => ({
          id: Number(c.id ?? c.id_cliente ?? 0),
          name: c.name || c.nombre || '',
        })).filter((c) => c.id && c.name);
        if (!ignore) {
          setClients(norm);
          if (defaultClientId && norm.some((c) => c.id === defaultClientId)) {
            setClienteId(defaultClientId);
          } else if (norm.length > 0) {
            setClienteId(norm[0].id);
          }
        }
      } catch {
        if (!ignore) setClients([]);
      }
    })();
    return () => { ignore = true; };
  }, [open, defaultClientId]);

  // Cargar carteras del cliente
  useEffect(() => {
    if (!open || !clienteId) {
      setFunds([]);
      setFondoId(null);
      return;
    }
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`/api/fondo?cliente_id=${clienteId}`, { cache: 'no-store' });
        if (!res.ok) throw new Error();
        const j = await res.json();
        const list = Array.isArray(j?.data) ? j.data : [];
        const norm = list.map((f) => ({
          id: f.id ?? f.id_fondo ?? 0,
          name: f.carteraNombre || f.tipoCarteraNombre || `Fondo ${f.id}`,
        })).filter((f) => f.id);
        if (!ignore) {
          setFunds(norm);
          if (norm.length > 0 && !fondoId) setFondoId(norm[0].id);
        }
      } catch {
        if (!ignore) {
          setFunds([]);
          setFondoId(null);
        }
      }
    })();
    return () => { ignore = true; };
  }, [open, clienteId]);

  // Movimientos del cliente para calcular disponibles por cartera/especie
  const [availableByKey, setAvailableByKey] = useState(new Map());
  useEffect(() => {
    if (!open || !clienteId) {
      setAvailableByKey(new Map());
      return;
    }
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`/api/movimiento?cliente_id=${clienteId}&limit=10000`, { cache: 'no-store' });
        if (!res.ok) throw new Error();
        const j = await res.json();
        const movs = Array.isArray(j?.data) ? j.data : [];
        const map = new Map();
        for (const m of movs) {
          const tipoM = String(m.tipo_mov || '').toLowerCase();
          const sign = tipoM === 'venta' ? -1 : 1;
          const fondoM = Number(m.fondo_id);
          const esp = m.especie || '';
          const key = `${fondoM}|${esp}`;
          const prev = map.get(key) || 0;
          map.set(key, prev + sign * (Number(m.nominal) || 0));
        }
        if (!ignore) setAvailableByKey(map);
      } catch {
        if (!ignore) setAvailableByKey(new Map());
      }
    })();
    return () => { ignore = true; };
  }, [open, clienteId]);

  // Opciones de especie para la cartera seleccionada
  const speciesOptions = useMemo(() => {
    if (!fondoId) return [];
    const prefix = `${fondoId}|`;
    const set = new Set();
    for (const k of availableByKey.keys()) {
      if (k.startsWith(prefix)) {
        const sp = k.slice(prefix.length);
        if (sp) set.add(sp);
      }
    }
    return Array.from(set).sort();
  }, [availableByKey, fondoId]);

  // Hint de disponibles para Egreso
  const availableHint = useMemo(() => {
    if (tipo !== 'Egreso' || !fondoId) return null;
    const espName = especieSel === '__NUEVA__' ? especieNueva : especieSel;
    if (!espName) return null;
    const key = `${fondoId}|${espName}`;
    const avail = availableByKey.get(key) || 0;
    return avail;
  }, [tipo, fondoId, especieSel, especieNueva, availableByKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clienteId || !fondoId) return;
    const espName = especieSel === '__NUEVA__' ? especieNueva : especieSel;
    if (!espName) {
      alert('Debe seleccionar o ingresar una especie');
      return;
    }
    if (tipo === 'Egreso' && availableHint !== null && Number(nominal) > availableHint) {
      if (!confirm(`El nominal (${nominal}) supera el disponible (${availableHint}). ¿Continuar?`)) return;
    }
    setLoading(true);
    try {
      const isoDate = toISODateTimeLocal(fecha);
      const payload = {
        cliente_id: clienteId,
        fondo_id: fondoId,
        fecha_alta: isoDate,
        tipo_mov: tipo === 'Egreso' ? 'venta' : 'compra',
        nominal: Number(nominal),
        precio_usd: precioUsd ? Number(precioUsd) : null,
        especie: espName,
      };
      const res = await fetch('/api/movimiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Error al crear movimiento');
      }
      // Actualizar filtro y refrescar datos
      setClientIdFilter(clienteId);
      refreshFirstPage();
      
      // Cerrar modal
      onClose();
      
      // Resetear formulario después de un pequeño delay
      setTimeout(() => {
        setFecha(getDefaultFecha());
        setTipo('Ingreso');
        setEspecieSel('');
        setEspecieNueva('');
        setNominal('');
        setPrecioUsd('');
        setFondoId(null);
      }, 300);
    } catch (err) {
      alert(err?.message || 'Error al crear movimiento');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, width: '90%' }}>
        <header className="modal-header">
          <h2>Agregar Movimiento</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>Cliente</span>
              <select value={clienteId ?? ''} onChange={(e) => setClienteId(Number(e.target.value))} required>
                <option value="">Seleccionar cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>Cartera</span>
              <select value={fondoId ?? ''} onChange={(e) => setFondoId(Number(e.target.value))} required disabled={!clienteId}>
                <option value="">Seleccionar cartera</option>
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>Tipo</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} required>
                <option value="Ingreso">Ingreso (Compra)</option>
                <option value="Egreso">Egreso (Venta)</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>Fecha y hora</span>
              <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>Especie</span>
            <select value={especieSel} onChange={(e) => setEspecieSel(e.target.value)} required>
              <option value="">Seleccionar especie</option>
              {speciesOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="__NUEVA__">+ Nueva especie</option>
            </select>
          </label>

          {especieSel === '__NUEVA__' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>Nombre nueva especie</span>
              <input type="text" value={especieNueva} onChange={(e) => setEspecieNueva(e.target.value)} required placeholder="Ej: AAPL" />
            </label>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>Nominal</span>
              <input type="number" value={nominal} onChange={(e) => setNominal(e.target.value)} required min="1" step="1" />
              {availableHint !== null && (
                <small style={{ color: Number(nominal) > availableHint ? '#b00' : '#666' }}>
                  Disponible: {availableHint}
                </small>
              )}
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>Precio USD (opcional)</span>
              <input type="number" value={precioUsd} onChange={(e) => setPrecioUsd(e.target.value)} step="0.01" min="0" placeholder="0.00" />
            </label>
          </div>

          <footer className="modal-footer" style={{ marginTop: 8 }}>
            <button type="button" className="btn secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn primary" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
          </footer>
        </form>
      </div>
    </div>
  );
}