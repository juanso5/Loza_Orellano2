'use client';

import { useMemo } from 'react';
import { 
  Briefcase, 
  Plane, 
  Target, 
  TrendingUp, 
  Calendar,
  DollarSign 
} from 'lucide-react';

// Componentes específicos para cada estrategia
const JubilacionCard = ({ data }) => {
  const { metadata, fecha_alta, rend_esperado, valor_total_fondo, rendimiento_real } = data;
  const fechaCreacion = new Date(fecha_alta);
  const fechaEstimada = new Date(fecha_alta);
  fechaEstimada.setFullYear(fechaEstimada.getFullYear() + (metadata?.anos || 0));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-blue-600 mb-1">Fecha Estimada</p>
          <p className="font-semibold text-blue-900 text-sm">{fechaEstimada.toLocaleDateString()}</p>
          <p className="text-xs text-blue-600">{metadata?.anos || 0} años</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <p className="text-xs text-green-600 mb-1">Patrimonio</p>
          <p className="font-semibold text-green-900 text-sm">${Number(valor_total_fondo || 0).toFixed(2)}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-xs text-gray-600">Rend. Esperado</p>
          <p className="font-semibold text-sm">{rend_esperado ? `${rend_esperado}%` : 'N/A'}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-xs text-gray-600">Rend. Real Anual</p>
          <p className={`font-semibold text-sm ${rendimiento_real >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Number(rendimiento_real || 0).toFixed(2)}%
          </p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-xs text-gray-600">Creación</p>
          <p className="font-semibold text-xs">{fechaCreacion.toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};

const ViajesCard = ({ data }) => {
  const { metadata, valor_total_fondo, rendimiento_real, tipo_cartera } = data;
  const monto_objetivo = metadata?.monto_objetivo || 0;
  const moneda = metadata?.moneda || 'USD';
  const progreso = monto_objetivo > 0 ? (valor_total_fondo / monto_objetivo) * 100 : 0;
  const nombre_cartera = tipo_cartera?.descripcion || 'Viajes';
  
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-orange-50 p-3 rounded-lg">
          <p className="text-xs text-orange-600 mb-1">Objetivo {moneda}</p>
          <p className="font-semibold text-orange-900 text-sm">${Number(monto_objetivo).toFixed(2)}</p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <p className="text-xs text-purple-600 mb-1">Patrimonio</p>
          <p className="font-semibold text-purple-900 text-sm">${Number(valor_total_fondo || 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 font-medium">Progreso</span>
          <span className="font-semibold">{progreso.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all flex items-center justify-end pr-2 ${
              progreso >= 100 ? 'bg-green-500' :
              progreso >= 75 ? 'bg-green-400' :
              progreso >= 50 ? 'bg-yellow-400' :
              progreso >= 25 ? 'bg-orange-400' :
              'bg-blue-400'
            }`}
            style={{ width: `${Math.min(progreso, 100)}%` }}
          >
            {progreso >= 10 && (
              <span className="text-xs font-bold text-white">${Number(valor_total_fondo || 0).toFixed(0)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="text-center p-2 bg-gray-50 rounded">
        <p className="text-xs text-gray-600">Rendimiento Real</p>
        <p className={`font-semibold ${rendimiento_real >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {Number(rendimiento_real || 0).toFixed(2)}%
        </p>
      </div>
    </div>
  );
};

const LargoPlazoCard = ({ data }) => {
  const { tipo_cartera, rendimiento_real } = data;
  const nombre_cartera = tipo_cartera?.descripcion || 'Largo Plazo';
  
  return (
    <div className="space-y-3">
      <div className="bg-blue-50 p-4 rounded-lg text-center">
        <p className="text-sm text-blue-600 mb-2">Rendimiento Real</p>
        <p className={`text-2xl font-bold ${rendimiento_real >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {Number(rendimiento_real || 0).toFixed(2)}%
        </p>
      </div>

      <div className="text-center text-sm text-gray-600">
        <p className="italic">Cartera de inversión a largo plazo</p>
      </div>
    </div>
  );
};

const ObjetivoCard = ({ data }) => {
  const { metadata, valor_total_fondo, rendimiento_real, tipo_cartera } = data;
  const monto_objetivo = metadata?.monto_objetivo || 0;
  const moneda = metadata?.moneda || 'USD';
  const fecha_objetivo = metadata?.fecha_objetivo ? new Date(metadata.fecha_objetivo) : null;
  const diasRestantes = fecha_objetivo ? Math.ceil((fecha_objetivo - new Date()) / (1000 * 60 * 60 * 24)) : 0;
  const nombre_cartera = tipo_cartera?.descripcion || 'Objetivo';
  
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-purple-50 p-3 rounded-lg">
          <p className="text-xs text-purple-600 mb-1">Objetivo {moneda}</p>
          <p className="font-semibold text-purple-900 text-sm">${Number(monto_objetivo).toFixed(2)}</p>
          {fecha_objetivo && (
            <p className="text-xs text-purple-600 font-medium mt-1">
              {diasRestantes > 0 ? `Faltan ${diasRestantes} días` : '⚠️ Vencido'}
            </p>
          )}
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-blue-600 mb-1">Fecha Objetivo</p>
          <p className="font-semibold text-blue-900 text-xs">
            {fecha_objetivo ? fecha_objetivo.toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>

      <div className="text-center p-2 bg-gray-50 rounded">
        <p className="text-xs text-gray-600">Rendimiento Real</p>
        <p className={`font-semibold ${rendimiento_real >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {Number(rendimiento_real || 0).toFixed(2)}%
        </p>
      </div>
    </div>
  );
};

// Componente principal que decide qué card mostrar
export default function EstrategiaCard({ data, onAsignar, onVerDetalle }) {
  const estrategia = useMemo(() => {
    // Prioridad: 1. metadata.estrategia, 2. tipo_cartera.categoria
    return (data.metadata?.estrategia || data.tipo_cartera?.categoria || '').toLowerCase();
  }, [data.metadata?.estrategia, data.tipo_cartera?.categoria]);

  const CardComponent = useMemo(() => {
    switch (estrategia) {
      case 'jubilacion': return JubilacionCard;
      case 'viajes': return ViajesCard;
      case 'largo_plazo': return LargoPlazoCard;
      case 'objetivo': return ObjetivoCard;
      default: return null;
    }
  }, [estrategia]);

  const getIcon = () => {
    switch (estrategia) {
      case 'jubilacion': return Briefcase;
      case 'viajes': return Plane;
      case 'largo_plazo': return TrendingUp;
      case 'objetivo': return Target;
      default: return Briefcase;
    }
  };

  const getColor = () => {
    const colorMap = {
      'jubilacion': '#4CAF50',
      'viajes': '#FF9800',
      'largo_plazo': '#2196F3',
      'objetivo': '#9C27B0'
    };
    return data.tipo_cartera?.color || colorMap[estrategia] || '#3b82f6';
  };

  if (!CardComponent) {
    // Si no hay estrategia definida, mostrar card genérica
    return (
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-all border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <p className="text-sm">Cartera sin estrategia definida</p>
          <p className="text-xs mt-2">ID: {data.id_fondo}</p>
        </div>
      </div>
    );
  }

  const Icon = getIcon();
  const color = getColor();
  const nombre_cartera = data.tipo_cartera?.descripcion || `Cartera ${data.id_fondo}`;

  return (
    <div 
      className="bg-white rounded-lg shadow hover:shadow-lg transition-all border-2 p-6"
      style={{ borderColor: color }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">{nombre_cartera}</h3>
          <p className="text-xs text-gray-500">ID: {data.id_fondo}</p>
        </div>
      </div>

      <CardComponent data={data} />
      
      <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
        <button
          onClick={() => onAsignar(data)}
          className="w-full px-4 py-2 text-white rounded-lg transition text-sm font-medium hover:opacity-90"
          style={{ backgroundColor: color }}
        >
          Asignar Liquidez
        </button>
        {onVerDetalle && (
          <button
            onClick={() => onVerDetalle(data)}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg transition text-sm font-medium hover:bg-gray-200"
          >
            Ver Detalle
          </button>
        )}
      </div>
    </div>
  );
}