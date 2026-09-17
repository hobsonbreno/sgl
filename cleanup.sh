#!/bin/bash
echo "Limpando cache e espaço do Docker..."
docker system prune -af --volumes
docker builder prune -af
echo "✅ Limpeza concluída. Espaço liberado!"
