# Metodologia de cálculo

## Escopo

O sistema estima **apenas** as emissões de CO₂ equivalente (CO₂e) do
**deslocamento dos participantes até o evento**. Nenhuma outra fonte (energia,
alimentação, resíduos, hospedagem) é considerada.

A metodologia é **inspirada na calculadora pública da Fundação SOS Mata
Atlântica** (<https://www.sosma.org.br/calcule-sua-emissao-de-co2>), que
trabalha com estimativas de CO₂e para transporte a partir de referências de
inventários de gases de efeito estufa (GHG Protocol Brasil / IPCC). O sistema
**não consulta** o site da SOS Mata Atlântica em momento algum: não há
scraping, não há chamada em tempo real. Os fatores vivem numa base **local e
versionada**.

## Fórmulas

```
emissão_kg_co2e = distância_km × fator_emissão (kg CO2e/km)

ida e volta:            distância_total = distância_ida × 2
veículo compartilhado:  emissão_individual = emissão_do_veículo ÷ nº de pessoas no veículo
bicicleta / a pé:       emissão_kg_co2e = 0
```

Cada fator tem uma **base** (`factor_basis`):

- `vehicle` — fator por veículo (carro, moto, van, app/táxi): a emissão do
  veículo é dividida pelo número de ocupantes informado;
- `passenger` — fator já por passageiro-km (ônibus, avião, "outro"): **não**
  se divide por ocupantes.

## Versionamento dos fatores

- Os fatores ficam em `backend/seeds/emission_factors.json` (fonte da verdade,
  com fonte documentada por fator) e são carregados na tabela
  `emission_factors` pelo seed. Uma cópia embarcada no totem
  (`totem/src/emissions/factors.json`) permite o cálculo 100% offline.
- Cada conjunto tem uma versão (atual: **`1.0.0-2026.07`**). Toda resposta
  grava em `transport_answers.calculation_version` a versão usada — os números
  de qualquer relatório são sempre rastreáveis ao conjunto de fatores da época.
- Ao atualizar fatores: crie uma **nova versão** no JSON do seed (nunca edite
  valores da versão antiga), rode `npm run seed` (desativa as versões
  anteriores e ativa a nova) e atualize a cópia do totem + rebuild.
- O servidor **recalcula** cada resposta recebida com os fatores ativos; se o
  valor do cliente divergir (>0,5 kg), grava o valor do servidor e registra
  `recalculated` em `sync_logs`.

## Fatores da versão 1.0.0-2026.07 (kg CO₂e/km)

| Modal | Combustível | Fator | Base | Derivação/fonte |
|---|---|---|---|---|
| Carro | Gasolina | 0,187 | veículo | 2,212 kg CO₂e/L (GHG Protocol Brasil/MCTI) ÷ 11,8 km/L |
| Carro | Etanol | 0,036 | veículo | CO₂ biogênico neutro; CH₄/N₂O residuais ≈0,436 kg CO₂e/L ÷ 8,1 km/L |
| Carro | Diesel | 0,201 | veículo | 2,613 kg CO₂e/L (diesel B) ÷ 13 km/L |
| Carro | GNV | 0,152 | veículo | 2,03 kg CO₂e/m³ ÷ 13,4 km/m³ |
| Carro | Flex | 0,126 | veículo | média ponderada gasolina/etanol 60/40 (perfil ANP) |
| Carro | Outro | 0,187 | veículo | assume gasolina (conservador) |
| Moto | Gasolina | 0,071 | veículo | 2,212 kg CO₂e/L ÷ 31 km/L |
| Moto | Etanol | 0,016 | veículo | análogo ao carro etanol, 27 km/L |
| Moto | Flex | 0,049 | veículo | média 60/40 |
| Van | Diesel | 0,278 | veículo | 2,613 kg CO₂e/L ÷ 9,4 km/L |
| Van | Gasolina | 0,295 | veículo | 2,212 kg CO₂e/L ÷ 7,5 km/L |
| App/Táxi | (idem carro) | — | veículo | mesmos fatores do carro por combustível |
| Ônibus | — | 0,027 | passageiro | DEFRA UK 2023, categoria *coach* (rodoviário/fretado) |
| Avião | — | 0,158 | passageiro | DEFRA UK 2023, voo doméstico, sem forçamento radiativo |
| Bicicleta/A pé | — | 0 | passageiro | deslocamento ativo |
| Outro | — | 0,100 | passageiro | valor médio conservador entre modais motorizados (estimativa documentada) |

Fontes primárias: Programa Brasileiro GHG Protocol (FGV/MCTI) para fatores de
combustíveis; DEFRA UK *GHG Conversion Factors 2023* para fatores por
passageiro-km; consumos médios de frota assumidos e documentados acima.

## Conversão em árvores (somente no dashboard)

```
árvores = teto( emissão_total_kg ÷ 163,14 )
```

163,14 kg CO₂ é a absorção média estimada de **uma árvore nativa da Mata
Atlântica ao longo de ~20 anos**, valor usual em projetos brasileiros de
restauração/neutralização (referência difundida por Iniciativa Verde/SOS Mata
Atlântica). Essa conversão **nunca** aparece para o participante — apenas no
dashboard administrativo e no relatório.

## Texto metodológico dos relatórios

> "Os cálculos apresentados são estimativas de emissões de CO₂ equivalente
> relacionadas exclusivamente ao transporte dos participantes até o evento. A
> metodologia foi inspirada na calculadora pública da Fundação SOS Mata
> Atlântica e utiliza fatores de emissão versionados, documentados e
> armazenados no sistema."
