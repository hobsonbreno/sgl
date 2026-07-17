import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Kanban from './pages/Kanban';
import PerfisBusca from './pages/PerfisBusca';
import Fornecedores from './pages/Fornecedores';
import OportunidadeDetalhe from './pages/OportunidadeDetalhe';
import { LayoutDashboard, KanbanSquare, Settings, Users } from 'lucide-react';
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
    <BrowserRouter>
      <div className="app-container">
        <aside className="sidebar">
          <h2>SGL PNCP</h2>
          <nav className="nav-menu">
            <NavItem to="/" icon={LayoutDashboard}>Dashboard</NavItem>
            <NavItem to="/kanban" icon={KanbanSquare}>Kanban</NavItem>
            <NavItem to="/fornecedores" icon={Users}>Fornecedores</NavItem>
            <NavItem to="/perfis-busca" icon={Settings}>Filtros (Perfis)</NavItem>
          </nav>
        </aside>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/kanban" element={<Kanban />} />
            <Route path="/perfis-busca" element={<PerfisBusca />} />
            <Route path="/fornecedores" element={<Fornecedores />} />
            <Route path="/oportunidades/:id" element={<OportunidadeDetalhe />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
