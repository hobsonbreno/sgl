#!/usr/bin/env bash
# Script para adicionar/atualizar keys no secret sgl-secrets do Kubernetes
# Carrega automaticamente de backend/.env se disponível, ou solicita digitação segura.

set -euo pipefail

NAMESPACE="default"
SECRET_NAME="sgl-secrets"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../backend/.env"

echo "=== Patch do Secret: $SECRET_NAME ==="
echo ""

# Tentar carregar do backend/.env
if [ -f "$ENV_FILE" ]; then
  echo "📄 Carregando variáveis de $ENV_FILE..."
  # Exporta chaves do backend/.env
  set -o allexport
  source "$ENV_FILE"
  set +o allexport
fi

SERPAPI_KEYS="${SERPAPI_KEYS:-8338d71376668694f8360ccb68aa678af450deaa344450f1cac387332f0f7a4a}"
GOV_BR_USER="${GOVBR_CPF:-${GOV_BR_USER:-}}"
GOV_BR_PASS="${GOVBR_SENHA:-${GOV_BR_PASS:-}}"

# Se GOV_BR_USER não foi definido, solicita ao usuário
if [ -z "$GOV_BR_USER" ]; then
  read -rp "🔐 Digite o GOV_BR_USER (usuário/CPF do gov.br): " GOV_BR_USER
fi

# Se GOV_BR_PASS não foi definido, solicita ao usuário
if [ -z "$GOV_BR_PASS" ]; then
  read -rsp "🔐 Digite o GOV_BR_PASS (senha do gov.br): " GOV_BR_PASS
  echo ""
fi

if [ -z "$GOV_BR_USER" ] || [ -z "$GOV_BR_PASS" ]; then
  echo "❌ Erro: GOV_BR_USER e GOV_BR_PASS são obrigatórios."
  exit 1
fi

echo "✅ SERPAPI_KEYS: ${SERPAPI_KEYS:0:8}..."
echo "✅ GOV_BR_USER: ${GOV_BR_USER}"
echo "✅ GOV_BR_PASS: ********"

echo ""
echo "📦 Criando/atualizando secret '$SECRET_NAME' no namespace '$NAMESPACE'..."

sudo kubectl create secret generic "$SECRET_NAME" \
  --namespace="$NAMESPACE" \
  --from-literal=SERPAPI_KEYS="$SERPAPI_KEYS" \
  --from-literal=GOV_BR_USER="$GOV_BR_USER" \
  --from-literal=GOV_BR_PASS="$GOV_BR_PASS" \
  --dry-run=client -o yaml | sudo kubectl apply -f -

echo ""
echo "✅ Secret atualizado! Keys presentes:"
sudo kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" \
  --output=go-template='{{range $k,$v := .data}}  - {{$k}}{{"\n"}}{{end}}'

if sudo kubectl get deployment/sgl-backend -n "$NAMESPACE" &>/dev/null; then
  echo ""
  echo "🔄 Reiniciando o deployment para recarregar as variáveis..."
  sudo kubectl rollout restart deployment/sgl-backend -n "$NAMESPACE"
  sudo kubectl rollout status deployment/sgl-backend -n "$NAMESPACE" --timeout=120s
else
  echo ""
  echo "ℹ️ Secret atualizado! (Deployment 'sgl-backend' não presente neste cluster local)."
fi

echo ""
echo "🎉 Patch aplicado com sucesso!"

