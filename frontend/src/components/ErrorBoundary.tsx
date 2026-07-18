import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro Capturado pelo ErrorBoundary:', error, errorInfo);
    // Aqui no futuro podemos integrar com um serviço como Sentry ou um endpoint /log no backend
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          backgroundColor: 'var(--bg-main)',
          color: 'var(--text-main)',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '500px',
            width: '100%',
            backgroundColor: 'var(--bg-card)',
            padding: '2.5rem',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-color)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem'
          }} role="alert" aria-live="assertive">
            
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626'
            }}>
              <AlertTriangle size={32} aria-hidden="true" />
            </div>

            <h1 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text-main)' }}>
              Algo deu errado ao carregar esta tela
            </h1>
            
            <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Ocorreu um erro inesperado e não foi possível exibir o conteúdo. 
              Nossa equipe técnica já pode ter sido notificada.
            </p>

            {import.meta.env?.DEV && this.state.error && (
              <pre style={{
                textAlign: 'left',
                background: '#f1f5f9',
                padding: '1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                overflowX: 'auto',
                width: '100%',
                color: '#334155'
              }}>
                {this.state.error.toString()}
              </pre>
            )}

            <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
              <button 
                onClick={this.handleReload}
                className="btn-primary"
                style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.75rem' }}
                aria-label="Recarregar a página atual"
              >
                <RotateCcw size={18} aria-hidden="true" /> Recarregar página
              </button>
              
              <button 
                onClick={this.handleGoHome}
                style={{ 
                  flex: 1, 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.75rem',
                  backgroundColor: 'transparent',
                  border: '2px solid var(--border-color)',
                  color: 'var(--text-main)',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                aria-label="Voltar para a página inicial"
              >
                <Home size={18} aria-hidden="true" /> Voltar ao Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
