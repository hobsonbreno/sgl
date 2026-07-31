import { useState } from 'react';

import { Calculator, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';

interface SimuladorProps {
  oportunidadeId: string;
}

export function SimuladorTributario({ oportunidadeId }: SimuladorProps) {
  const [lanceTotal, setLanceTotal] = useState<number>(0);
  const [modeloEntrega, setModeloEntrega] = useState<'INTEGRAL' | 'FRACIONADO'>('INTEGRAL');
  const [mesesContrato, setMesesContrato] = useState<number>(12);
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSimular = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://192.168.1.16:30000/oportunidades/simular-imposto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oportunidadeId,
          lanceTotal: Number(lanceTotal),
          modeloEntrega,
          mesesContrato: modeloEntrega === 'FRACIONADO' ? Number(mesesContrato) : undefined,
        })
      });
      if (!res.ok) throw new Error('Erro na requisição');
      const data = await res.json();
      setResultado(data);
    } catch (error) {
      console.error('Erro na simulação', error);
      alert('Erro ao calcular simulação tributária.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
        <Calculator className="text-blue-600" />
        Simulador de Estratégia de Lances (Anexo III)
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Nosso Lance Total (R$)</label>
          <input
            type="number"
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            value={lanceTotal}
            onChange={(e) => setLanceTotal(Number(e.target.value))}
            placeholder="Ex: 50000"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Modelo de Entrega</label>
          <select 
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            value={modeloEntrega} 
            onChange={(e) => setModeloEntrega(e.target.value as any)}
          >
            <option value="INTEGRAL">INTEGRAL (Única NF)</option>
            <option value="FRACIONADO">FRACIONADO (Mensal)</option>
          </select>
        </div>

        {modeloEntrega === 'FRACIONADO' && (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Meses de Contrato</label>
            <input
              type="number"
              min="2"
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={mesesContrato}
              onChange={(e) => setMesesContrato(Number(e.target.value))}
            />
          </div>
        )}
      </div>

      <button
        onClick={handleSimular}
        disabled={loading || lanceTotal <= 0}
        className="w-full md:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow transition-colors disabled:opacity-50"
      >
        {loading ? 'Simulando Esteira...' : 'Rodar Simulação'}
      </button>

      {resultado && (
        <div className="mt-8 border-t border-slate-200 pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
              <h4 className="text-md font-bold text-slate-700">Resumo da Operação</h4>
              <p className="text-sm text-slate-500">RBT12 Inicial Utilizado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resultado.rbt12Inicial)}</p>
            </div>
            
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold ${
              resultado.statusOperacao === 'LUCRO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {resultado.statusOperacao === 'LUCRO' ? <CheckCircle2 size={20}/> : <AlertTriangle size={20}/>}
              Lucro Líquido Real: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resultado.lucroLiquidoTotal)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {resultado.projecaoMensal.map((mes: any) => (
              <div key={mes.mesIndex} className="bg-slate-50 border border-slate-200 rounded p-4 relative overflow-hidden group hover:border-blue-400 transition-colors">
                <div className="absolute top-0 right-0 bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-bl font-bold">
                  MÊS {mes.mesIndex}
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">RBT12 Projetado:</span>
                    <span className="font-medium text-slate-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mes.rbt12Projetado)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-1"><TrendingUp size={14}/> Alíquota Efetiva:</span>
                    <span className="font-bold text-orange-600">
                      {(mes.aliquotaEfetiva * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Imposto (DAS):</span>
                    <span className="font-medium text-red-500">
                      - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mes.impostoMensal)}
                    </span>
                  </div>
                  <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between text-sm font-bold">
                    <span className="text-slate-700">Margem Limpa:</span>
                    <span className={mes.lucroLiquidoMensal > 0 ? 'text-green-600' : 'text-red-600'}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mes.lucroLiquidoMensal)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
