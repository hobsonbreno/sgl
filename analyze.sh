#!/bin/bash

echo "=========================================="
echo "🔍 ANÁLISE COMPLETA DO PROJETO"
echo "=========================================="
echo ""

PROJECT_NAME=$(basename $(pwd))
echo "📁 Projeto: $PROJECT_NAME"
echo ""

# Detectar se é Docker Compose ou K3s
if [ -f "docker-compose.yml" ]; then
    DEPLOYMENT_TYPE="Docker Compose"
elif [ -f "k3s-deployment.yaml" ] || [ -f "deployment.yaml" ] || [ -f "kustomization.yaml" ]; then
    DEPLOYMENT_TYPE="Kubernetes/K3s"
else
    echo "❌ Erro: Nenhum arquivo de orquestração encontrado!"
    echo "   (docker-compose.yml ou K3s deployment.yaml)"
    exit 1
fi

echo "🚀 Tipo de Deploy: $DEPLOYMENT_TYPE"
echo ""

# ============= DOCKER COMPOSE =============
if [ "$DEPLOYMENT_TYPE" = "Docker Compose" ]; then

    echo "=========================================="
    echo "📋 SERVIÇOS IDENTIFICADOS:"
    echo "=========================================="
    grep -E "^\s{2}[a-z_].*:" docker-compose.yml | grep -v "volumes:" | grep -v "ports:" | grep -v "environment:" | awk '{print "  - " $1}' | sed 's/:$//'

    echo ""
    echo "=========================================="
    echo "🔌 PORTAS MAPEADAS:"
    echo "=========================================="

    python3 << 'EOF'
import yaml
with open('docker-compose.yml', 'r') as f:
    try:
        compose = yaml.safe_load(f)
        for service_name, service_config in compose.get('services', {}).items():
            if isinstance(service_config, dict) and 'ports' in service_config:
                ports = service_config['ports']
                for port in ports:
                    print(f"  {service_name}: {port}")
    except:
        print("  ⚠️ Erro ao parsear YAML")
EOF

    echo ""
    echo "=========================================="
    echo "🗄️  BANCOS DE DADOS DETECTADOS:"
    echo "=========================================="
    if grep -iq "mongo" docker-compose.yml; then
        echo "  ✅ MongoDB"
        MONGO_PORT=$(grep -A 5 "mongo:" docker-compose.yml | grep -oP '[0-9]+(?=:27017)' | head -1)
        [ ! -z "$MONGO_PORT" ] && echo "     Porta: $MONGO_PORT:27017"
    fi
    if grep -iq "postgres" docker-compose.yml; then
        echo "  ✅ PostgreSQL"
    fi
    if grep -iq "mysql" docker-compose.yml; then
        echo "  ✅ MySQL"
    fi
    if grep -iq "redis" docker-compose.yml; then
        echo "  ✅ Redis"
    fi

    echo ""
    echo "=========================================="
    echo "🎨 FRONTEND/⚙️ BACKEND:"
    echo "=========================================="
    if grep -iq "frontend\|nginx" docker-compose.yml; then
        echo "  ✅ Frontend (nginx)"
    fi
    if grep -iq "backend" docker-compose.yml; then
        echo "  ✅ Backend"
    fi

    echo ""
    echo "=========================================="
    echo "📊 RESUMO:"
    echo "=========================================="
    TOTAL_SERVICES=$(grep -E "^\s{2}[a-z_].*:" docker-compose.yml | grep -v "volumes:" | grep -v "ports:" | grep -v "environment:" | wc -l)
    echo "  Total de serviços: $TOTAL_SERVICES"

# ============= KUBERNETES/K3S =============
else

    echo "=========================================="
    echo "📋 DEPLOYMENTS IDENTIFICADOS:"
    echo "=========================================="
    grep -h "name:" *.yaml | grep -oP '(?<=name: )[^"]+' | awk '{print "  - " $0}'

    echo ""
    echo "=========================================="
    echo "🔌 SERVIÇOS E PORTAS:"
    echo "=========================================="
    grep -h "port:" *.yaml | head -10 | awk '{print "  " $0}'

    echo ""
    echo "=========================================="
    echo "🗄️  BANCOS DE DADOS DETECTADOS:"
    echo "=========================================="
    if grep -iq "mongo" *.yaml; then
        echo "  ✅ MongoDB"
    fi
    if grep -iq "postgres" *.yaml; then
        echo "  ✅ PostgreSQL"
    fi
    if grep -iq "mysql" *.yaml; then
        echo "  ✅ MySQL"
    fi
    if grep -iq "redis" *.yaml; then
        echo "  ✅ Redis"
    fi

    echo ""
    echo "=========================================="
    echo "📊 RESUMO:"
    echo "=========================================="
    TOTAL_DEPLOYS=$(grep -c "kind: Deployment" *.yaml 2>/dev/null || echo "0")
    TOTAL_SERVICES=$(grep -c "kind: Service" *.yaml 2>/dev/null || echo "0")
    echo "  Total de Deployments: $TOTAL_DEPLOYS"
    echo "  Total de Services: $TOTAL_SERVICES"

fi

echo ""
echo "=========================================="
echo "🐳 INFORMAÇÕES DO DOCKER/K3S:"
echo "=========================================="
DOCKER_VERSION=$(docker --version 2>/dev/null | grep -oP 'Docker version \K[^,]+' || echo "Não instalado")
echo "  Docker: $DOCKER_VERSION"

if command -v k3s &> /dev/null; then
    K3S_VERSION=$(k3s --version 2>/dev/null | grep -oP 'v[0-9.]+' | head -1)
    echo "  K3s: $K3S_VERSION"
fi

echo ""
echo "=========================================="
echo "💾 ESPAÇO EM DISCO:"
echo "=========================================="
DISK_USAGE=$(df -h / | awk 'NR==2 {printf "%s / %s (%s)", $3, $2, $5}')
echo "  Uso: $DISK_USAGE"

echo ""
echo "=========================================="
echo "✅ Análise concluída!"
echo "=========================================="
