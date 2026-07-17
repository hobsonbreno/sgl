#!/bin/bash
echo "Iniciando o Sistema de Gestão de Licitações (SGL)..."
docker compose up -d --build
echo "Serviços iniciados:"
echo "- Frontend: http://localhost:7000"
echo "- Backend (Swagger): http://localhost:7005/api/docs"
