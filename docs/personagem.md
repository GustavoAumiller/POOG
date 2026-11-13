# Modelagem do robô

O personagem deste branch é um robô low poly construído por código em
`src/entities/playerModel.ts`, usando caixas e cilindros do Babylon.js.
Não precisa de Blender, texturas ou downloads de modelos para funcionar.

## Ver no jogo

```bash
npm ci
npm run dev
```

Abra `http://localhost:3000` e clique em **Iniciar**. Use **WASD** ou as setas
para andar e mova o mouse para girar a câmera. **Esc** pausa o jogo.
O robô olha para o inimigo mais próximo, seguindo a lógica de combate existente.

## Como o modelo foi montado

1. **Silhueta:** caixas formam tronco, capacete, ombreiras, mochila e botas.
   Cilindros com oito lados formam pescoço, juntas e cano da arma.
2. **Materiais:** a paleta `ROBOT_COLORS` define armadura laranja, estrutura
   escura, detalhes claros e luzes ciano. Visor, reator e mochila usam materiais
   emissivos para permanecerem legíveis na iluminação da arena.
3. **Hierarquia:** o nó `robot` é filho do `Player`. O tronco agrupa cabeça e
   braços; cada braço e perna tem um pivô próprio na articulação.
4. **Animação:** `update()` alterna as pernas e balança os braços conforme o
   deslocamento real do jogador. Ao parar, as articulações retornam suavemente
   ao repouso e o tronco faz um movimento leve. A pausa congela as animações.
5. **Integração:** o cubo original fica invisível e continua controlando
   colisões, posição, câmera, vida e disparos. As peças visuais não colidem.
   O modelo recebe a escala da caixa local do jogador e participa das sombras.

## Personalizar

- **Cores:** edite os valores hexadecimais de `ROBOT_COLORS`.
- **Proporções:** em `box()`, o primeiro vetor é `[largura, altura, profundidade]`
  e o segundo é a posição `[x, y, z]` relativa ao pai.
- **Juntas:** `pivot()` define o ponto em torno do qual um membro gira.
  `createLeg()` e `createArm()` montam os dois lados usando o mesmo desenho.
- **Frente:** o visor e a arma apontam para **+Z**. Mantenha essa convenção
  para que o modelo acompanhe a direção escolhida pelo controle de movimento.
- **Passos:** ajuste os multiplicadores de rotação em `update()` para mudar
  a amplitude; o divisor `45` controla a distância de cada meia passada.

O desenho usa uma caixa de referência de 100 unidades, com o chão em `y = -50`
e o centro do jogador em `y = 0`. Mantenha novas peças próximas desse volume
para conservar a correspondência entre aparência e área de colisão.

As alterações aparecem ao recarregar o jogo. O modelo é criado pelo script
`moving.ts` ao iniciar a cena, inclusive quando ele roda pelo Babylon.js Editor;
as peças não são gravadas nos arquivos exportados da cena.
