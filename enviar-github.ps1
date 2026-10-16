# ============================================================
# SCRIPT AUTOMÁTICO PARA ENVIAR PROJETO AO GITHUB
# ============================================================
# PRÉ-REQUISITO: Instalar o Git em https://git-scm.com/
# E criar um repositório vazio no GitHub (não inicialize com README)
# ============================================================

# URL do seu repositório (já configurada)
$repoUrl = "https://github.com/Naujxxxxx/GamerConnections.git"

Write-Host "Iniciando envio automático ao GitHub..." -ForegroundColor Cyan

# Verifica se o git está instalado
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: Git não encontrado. Instale em https://git-scm.com/ e tente novamente." -ForegroundColor Red
    exit 1
}

# Inicializa repositório git (se já não existir)
if (-not (Test-Path ".git")) {
    Write-Host "Inicializando repositório Git..." -ForegroundColor Yellow
    git init
} else {
    Write-Host "Repositório Git já existe." -ForegroundColor Green
}

# Configura user (ajuste seu nome e email se quiser)
git config user.name "Seu Nome"
git config user.email "seu-email@exemplo.com"

# Adiciona todos os arquivos
Write-Host "Adicionando arquivos..." -ForegroundColor Yellow
git add .

# Faz o commit
Write-Host "Fazendo commit..." -ForegroundColor Yellow
git commit -m "commit inicial: projeto GamerConnections pronto para Vercel"

# Adiciona o remote do GitHub
Write-Host "Conectando ao repositório GitHub..." -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin $repoUrl

# Renomeia branch para main (padrão do GitHub)
git branch -M main

# Envia para o GitHub
Write-Host "Enviando para o GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host "Concluído! Seu projeto está no GitHub." -ForegroundColor Green
Write-Host "Agora importe este repositório no Vercel (vercel.com)." -ForegroundColor Cyan
