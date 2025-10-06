#!/bin/bash

# Script de inicialização do IPTV Manager
# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     IPTV Manager - Inicializador      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não encontrado!${NC}"
    echo -e "${YELLOW}Por favor, instale Node.js 16+ de https://nodejs.org${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js encontrado: $(node --version)${NC}"
echo ""

# Função para instalar dependências
install_dependencies() {
    local dir=$1
    local name=$2
    
    echo -e "${BLUE}📦 Instalando dependências do $name...${NC}"
    cd "$dir" || exit
    
    if [ ! -d "node_modules" ]; then
        npm install
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Dependências do $name instaladas com sucesso!${NC}"
        else
            echo -e "${RED}❌ Erro ao instalar dependências do $name${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✓ Dependências do $name já instaladas${NC}"
    fi
    
    cd ..
    echo ""
}

# Instalar dependências do backend
if [ -d "backend" ]; then
    install_dependencies "backend" "Backend"
else
    echo -e "${RED}❌ Pasta 'backend' não encontrada${NC}"
    exit 1
fi

# Instalar dependências do frontend
if [ -d "frontend" ]; then
    install_dependencies "frontend" "Frontend"
else
    echo -e "${RED}❌ Pasta 'frontend' não encontrada${NC}"
    exit 1
fi

# Iniciar backend em background
echo -e "${BLUE}🚀 Iniciando Backend...${NC}"
cd backend
npm start &
BACKEND_PID=$!
cd ..
echo -e "${GREEN}✓ Backend iniciado (PID: $BACKEND_PID)${NC}"
echo -e "${GREEN}   Rodando em: http://localhost:3001${NC}"
echo ""

# Aguardar 3 segundos para o backend inicializar
sleep 3

# Iniciar frontend
echo -e "${BLUE}🚀 Iniciando Frontend...${NC}"
cd frontend
npm start &
FRONTEND_PID=$!
cd ..
echo -e "${GREEN}✓ Frontend iniciado (PID: $FRONTEND_PID)${NC}"
echo -e "${GREEN}   Rodando em: http://localhost:3000${NC}"
echo ""

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✓ IPTV Manager iniciado com sucesso!║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📌 Informações:${NC}"
echo -e "   Backend:  http://localhost:3001"
echo -e "   Frontend: http://localhost:3000"
echo ""
echo -e "${YELLOW}Para parar os servidores, pressione Ctrl+C${NC}"
echo ""

# Função para parar os processos ao receber Ctrl+C
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Encerrando servidores...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✓ Servidores encerrados${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Aguardar até que o usuário pare o script
wait