#!/bin/bash

echo "=========================================="
echo "🔍 ANÁLISE CONSOLIDADA DE TODOS OS PROJETOS"
echo "=========================================="
echo ""

PROJECTS_DIR="$HOME/Documentos/projetos"

if [ ! -d "$PROJECTS_DIR" ]; then
    echo "❌ Diretório não encontrado: $PROJECTS_DIR"
    exit 1
fi

echo "📁 Diretório: $PROJECTS_DIR"
echo ""

echo "=========================================="
echo "📊 PROJETOS ENCONTRADOS:"
echo "=========================================="
echo ""

for project_path in "$PROJECTS_DIR"/*; do
    [ -d "$project_path" ] || continue
    
    project_name=$(basename "$project_path")
    
    if [ -f "$project_path/docker-compose.yml" ]; then
        echo "🟢 $project_name"
        echo "   Portas:"
        python3 << EOF 2>/dev/null
import yaml
try:
    with open('$project_path/docker-compose.yml', 'r') as f:
        compose = yaml.safe_load(f)
        for service, config in compose.get('services', {}).items():
            if isinstance(config, dict) and 'ports' in config:
                for port in config['ports']:
                    port_str = str(port)
                    if not port_str.startswith('\${'):
                        print(f"     - {port_str}")
except:
    pass
EOF
        
        if grep -iq "mongo\|postgres\|mysql\|redis" "$project_path/docker-compose.yml"; then
            echo "   Bancos:"
            grep -iq "mongo" "$project_path/docker-compose.yml" && echo "     ✅ MongoDB"
            grep -iq "postgres" "$project_path/docker-compose.yml" && echo "     ✅ PostgreSQL"
            grep -iq "mysql" "$project_path/docker-compose.yml" && echo "     ✅ MySQL"
            grep -iq "redis" "$project_path/docker-compose.yml" && echo "     ✅ Redis"
        fi
        
    elif [ -f "$project_path/deployment.yaml" ] || [ -f "$project_path/k3s-deployment.yaml" ]; then
        echo "🔵 $project_name (Kubernetes/K3s)"
    else
        echo "⚪ $project_name (sem arquivo de orquestração)"
    fi
    
    echo ""
done

echo "=========================================="
echo "🔌 TODAS AS PORTAS EM USO:"
echo "=========================================="

python3 << 'PYEOF'
import os
import yaml
from collections import defaultdict

projects_dir = os.path.expanduser("~/Documentos/projetos")
all_ports = {}

for project_name in os.listdir(projects_dir):
    project_path = os.path.join(projects_dir, project_name)
    if not os.path.isdir(project_path):
        continue
    
    compose_file = os.path.join(project_path, "docker-compose.yml")
    if not os.path.exists(compose_file):
        continue
    
    try:
        with open(compose_file, 'r') as f:
            compose = yaml.safe_load(f)
            for service, config in compose.get('services', {}).items():
                if isinstance(config, dict) and 'ports' in config:
                    for port in config['ports']:
                        port_str = str(port)
                        # Pular variáveis de ambiente
                        if port_str.startswith('${'):
                            continue
                        host_port = port_str.split(':')[0].replace('"', '')
                        try:
                            int(host_port)
                            all_ports[host_port] = (project_name, port_str)
                        except:
                            pass
    except:
        continue

if all_ports:
    sorted_ports = sorted(all_ports.keys(), key=lambda x: int(x))
    for port in sorted_ports:
        project, full_port = all_ports[port]
        print(f"  {port:5s} ← {project:30s} ({full_port})")
else:
    print("  Nenhuma porta encontrada")

PYEOF

echo ""
echo "=========================================="
echo "⚠️  ALERTAS DE CONFLITO:"
echo "=========================================="

python3 << 'PYEOF'
import os
import yaml
from collections import Counter

projects_dir = os.path.expanduser("~/Documentos/projetos")
port_usage = Counter()
port_projects = {}

for project_name in os.listdir(projects_dir):
    project_path = os.path.join(projects_dir, project_name)
    if not os.path.isdir(project_path):
        continue
    
    compose_file = os.path.join(project_path, "docker-compose.yml")
    if not os.path.exists(compose_file):
        continue
    
    try:
        with open(compose_file, 'r') as f:
            compose = yaml.safe_load(f)
            for service, config in compose.get('services', {}).items():
                if isinstance(config, dict) and 'ports' in config:
                    for port in config['ports']:
                        port_str = str(port)
                        if port_str.startswith('${'):
                            continue
                        host_port = port_str.split(':')[0].replace('"', '')
                        try:
                            int(host_port)
                            port_usage[host_port] += 1
                            if host_port not in port_projects:
                                port_projects[host_port] = []
                            port_projects[host_port].append(project_name)
                        except:
                            pass
    except:
        continue

has_conflicts = False
for port, count in port_usage.items():
    if count > 1:
        has_conflicts = True
        projects = ', '.join(set(port_projects[port]))
        print(f"  🔴 Porta {port} em conflito entre: {projects}")

if not has_conflicts:
    print("  ✅ Nenhum conflito de portas detectado!")

PYEOF

echo ""
echo "=========================================="
echo "📋 RECOMENDAÇÕES PARA NOVO PROJETO:"
echo "=========================================="

python3 << 'PYEOF'
import os
import yaml

projects_dir = os.path.expanduser("~/Documentos/projetos")
used_ports = set()

for project_name in os.listdir(projects_dir):
    project_path = os.path.join(projects_dir, project_name)
    if not os.path.isdir(project_path):
        continue
    
    compose_file = os.path.join(project_path, "docker-compose.yml")
    if not os.path.exists(compose_file):
        continue
    
    try:
        with open(compose_file, 'r') as f:
            compose = yaml.safe_load(f)
            for service, config in compose.get('services', {}).items():
                if isinstance(config, dict) and 'ports' in config:
                    for port in config['ports']:
                        port_str = str(port)
                        if port_str.startswith('${'):
                            continue
                        host_port = port_str.split(':')[0].replace('"', '')
                        try:
                            used_ports.add(int(host_port))
                        except:
                            pass
    except:
        continue

free_ports = []
for port in range(7000, 8100):
    if port not in used_ports:
        free_ports.append(port)

if free_ports:
    print("  Portas livres recomendadas:")
    print(f"    Frontend (HTTP):     {free_ports[0]}:80")
    if len(free_ports) > 1:
        print(f"    Backend:             {free_ports[1]}:3000")
    if len(free_ports) > 2:
        print(f"    MongoDB:             {free_ports[2]}:27017")
    if len(free_ports) > 3:
        print(f"    Outro serviço:       {free_ports[3]}:8000")
else:
    print("  ⚠️ Sem portas livres disponíveis no range 7000-8100")

PYEOF

echo ""
echo "=========================================="
echo "💾 ESPAÇO EM DISCO:"
echo "=========================================="
df -h / | awk 'NR==2 {printf "  Uso: %s / %s (%s)\n", $3, $2, $5}'

echo ""
echo "=========================================="
echo "✅ Análise consolidada concluída!"
echo "=========================================="