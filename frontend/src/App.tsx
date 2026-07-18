import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Kanban from './pages/Kanban';
import PerfisBusca from './pages/PerfisBusca';
import Fornecedores from './pages/Fornecedores';
import Orgaos from './pages/Orgaos';
import Produtos from './pages/Produtos';
import Relatorios from './pages/Relatorios';
import MarketIntelligence from './pages/MarketIntelligence';
import Configuracoes from './pages/Configuracoes';
import OportunidadeDetalhe from './pages/OportunidadeDetalhe';
import { LayoutDashboard, KanbanSquare, Settings, Users, Building, Package, PieChart, BrainCircuit, Wrench } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

function NavItem({ to, icon: Icon, children }: any) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to) && (to !== '/' || location.pathname === '/');
  return (
    <Link to={to} className={`nav-link ${isActive ? 'active' : ''}`}>
      <Icon size={20} />
      {children}
    </Link>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="app-container">
          <aside className="sidebar">
            <h2>SGL PNCP</h2>
            <nav className="nav-menu">
              <NavItem to="/" icon={LayoutDashboard}>Dashboard</NavItem>
              <NavItem to="/kanban" icon={KanbanSquare}>Kanban</NavItem>
              <NavItem to="/orgaos" icon={Building}>Órgãos</NavItem>
              <NavItem to="/fornecedores" icon={Users}>Fornecedores</NavItem>
              <NavItem to="/produtos" icon={Package}>Produtos</NavItem>
              <NavItem to="/relatorios" icon={PieChart}>Relatório Final</NavItem>
              <NavItem to="/market-intelligence" icon={BrainCircuit}>Inteligência de Mercado</NavItem>
              <NavItem to="/perfis-busca" icon={Settings}>Filtros (Perfis)</NavItem>
              <NavItem to="/configuracoes" icon={Wrench}>Config. do Robô</NavItem>
            </nav>
          </aside>
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/kanban" element={<Kanban />} />
              <Route path="/perfis-busca" element={<PerfisBusca />} />
              <Route path="/orgaos" element={<Orgaos />} />
              <Route path="/fornecedores" element={<Fornecedores />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/market-intelligence" element={<MarketIntelligence />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/oportunidades/:id" element={<OportunidadeDetalhe />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
