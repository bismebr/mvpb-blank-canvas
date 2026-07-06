## Objetivo

Melhorar a versão **desktop** (≥1024px) do projeto Bisme, com foco no painel administrativo nos modos claro e escuro. **Nada da versão mobile será alterado** — todas as mudanças ficam dentro de `@media (min-width: 1024px)`.

## Estratégia técnica

A maior parte do painel hoje usa estilos inline (style={{…}}) calibrados para mobile. Refazer aba por aba seria arriscado e longo. A abordagem mais segura e eficaz:

1. **Camada CSS global desktop-only** em `src/styles.css`, dentro de `@media (min-width: 1024px)`, agindo sobre classes/seletores já existentes no painel admin (`.agenda-page`, `[data-admin-theme]`, footer fixo, etc).
2. **Pequenos ganchos de classe** adicionados nos containers raiz de cada aba para que o CSS desktop possa centralizar, aplicar `max-width`, criar grids 2/3 colunas e melhorar respiro — sem tocar nos estilos inline mobile.
3. **Correções pontuais de dark mode** em pontos onde ainda há `#FFFFFF` hardcoded em modais/listagens (continuação do trabalho já feito na Agenda).

Nada de lógica, rotas, dados, auth, filtros, status, agendamentos.

## Escopo de mudanças

### Painel admin (prioridade alta)
- Container raiz de cada aba ganha `className="admin-tab"` (Agenda já tem `agenda-page`).
- CSS desktop:
  - `.admin-tab { max-width: 1200px; margin-inline: auto; padding-inline: 32px; }`
  - Grids 2–3 colunas para Serviços, Funcionários, Clientes, Avaliações, Mensagens, Modelos, Meu link.
  - Agenda: centralizar header, faixa de dias com `max-width` confortável, lista de agendamentos centralizada, sem faixas brancas no dark.
  - Configurações / Meu site: formulários com `max-width: 720px` centralizados.
  - Assinatura: cards de plano em grid de 3 colunas.
  - Footer fixo: `max-width: 1200px` centralizado, mantendo grid de 5 itens com mais respiro.
  - Sheet do menu (3 traços): no desktop vira modal centralizado com `max-width: 520px`, não bottom sheet.
- Dark mode: varredura de `#FFFFFF`/`#FAFAFA` hardcoded em modais admin, troca por tokens `COLORS.bgSurface` quando aplicável.

### Áreas públicas (prioridade menor)
- Página de venda, home cliente, login/cadastro empresário, onboarding: aplicar `max-width` e respiro lateral em desktop via CSS, sem refazer layouts.

### Regras invioláveis
- Zero alteração em CSS/estilos mobile.
- Zero alteração em lógica, dados, rotas, schemas, validações.
- Identidade visual mantida (laranja `#ff712b`, tipografia, bordas suaves).
- Sem dependências novas.

## Entrega

- `src/styles.css`: novo bloco `@media (min-width: 1024px)` com todas as regras desktop do painel e áreas públicas.
- `src/routes/admin.tsx`: adicionar `className` no main e ajustes desktop do footer fixo via CSS.
- Cada arquivo de aba (`AgendamentosTela.tsx`, `ServicosTela`, `ClientesTela`, etc): adicionar `className="admin-tab"` no wrapper raiz — uma linha por arquivo.
- Pontos remanescentes de `#FFFFFF` em modais admin trocados por token de tema.

## Verificação

- `bunx tsc --noEmit` após as edições.
- Inspeção via Playwright headless em 1440×900 nos dois temas, abas principais (Agenda, Dashboard, Serviços, Configurações), capturando screenshots.
- Confirmar via DevTools que `@media (max-width: 1023px)` não foi alterado e que mobile a 390px segue idêntico.

## Riscos

- Muitos estilos inline têm prioridade sobre CSS — pode ser necessário `!important` cirúrgico em algumas regras desktop. Aceitável e limitado ao bloco desktop.
- Volume de arquivos a tocar (~15 telas). Plano executado em uma única passada de edições paralelas após aprovação.
