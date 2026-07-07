# Limitações das estimativas

Os números produzidos pelo sistema são **estimativas de ordem de grandeza**,
adequadas para sensibilização e para dimensionar ações de compensação — não são
um inventário auditável de gases de efeito estufa.

## Limitações dos dados de entrada

- **Distância autodeclarada**: o participante informa um valor aproximado, sem
  verificação por rota real.
- **Ocupação do veículo autodeclarada**: o rateio por ocupante depende do
  número informado.
- **Um único modal por resposta**: trajetos multimodais (ex.: avião + app) são
  representados pelo modal principal escolhido pelo participante.
- **Sem deduplicação de pessoas**: quem responde duas vezes no totem gera dois
  registros (a deduplicação por UUID evita duplicar *sincronizações*, não
  *pessoas*).

## Limitações dos fatores de emissão

- Fatores usam **consumos médios de frota** (km/L) assumidos e documentados —
  o veículo real do participante pode consumir mais ou menos.
- O fator **flex** assume um mix fixo gasolina/etanol (60/40).
- O fator de **ônibus** usa a categoria *coach* (rodoviário/fretado) com
  ocupação média internacional; ônibus urbanos lotados ou vazios divergem.
- O fator de **avião** é um valor médio de voos domésticos por passageiro-km,
  **sem** forçamento radiativo (incluí-lo poderia até dobrar o valor) e sem
  distinção de classe ou aeronave.
- O modal **"outro"** usa um valor médio conservador (0,100 kg CO₂e/km) por
  definição impreciso.
- **Aplicativo/táxi** não contabiliza os km rodados vazios até o embarque.
- Fatores de combustível são de escopo de **queima (tail-pipe)**; a cadeia de
  produção do combustível (well-to-tank) não está incluída.

## Limitações da conversão em árvores

A conversão (163,14 kg CO₂/árvore em ~20 anos) é uma média usada em projetos de
restauração da Mata Atlântica. A absorção real varia com espécie, solo, clima e
mortalidade. O número de árvores é um **indicador de comunicação**, não um
compromisso técnico de compensação — para neutralização formal, contrate um
projeto certificado.

## Recomendação de uso

Comunique sempre os resultados como "emissão **estimada**", mantenha a
observação metodológica nos relatórios e preserve a `calculation_version` de
cada resposta para rastreabilidade.
