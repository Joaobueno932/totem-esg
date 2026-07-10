# Referências e cálculo de cada fator

Documento enxuto com **apenas** (1) os **links das referências** usadas e (2) o
**cálculo aplicado em cada fator** de emissão. Versão dos fatores:
**`1.0.0-2026.07`**. Fonte da verdade: [backend/seeds/emission_factors.json](../backend/seeds/emission_factors.json).

---

## Referências (links)

| # | Referência | Link |
|---|---|---|
| R1 | Programa Brasileiro GHG Protocol (FGV / MCTI) — fatores de combustíveis | https://eaesp.fgv.br/centros/centro-estudos-sustentabilidade/projetos/programa-brasileiro-ghg-protocol |
| R2 | DEFRA UK — *GHG Conversion Factors 2023* — fatores por passageiro-km | https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023 |
| R3 | ANP — perfil de abastecimento da frota flex brasileira | https://www.gov.br/anp |
| R4 | Fundação SOS Mata Atlântica — calculadora pública (metodologia inspiradora) | https://www.sosma.org.br/calcule-sua-emissao-de-co2 |

---

## Como o fator vira emissão

Duas fórmulas, conforme a base do fator (`factor_basis`):

```
distância_total = round_trip ? distância_km × 2 : distância_km

vehicle    → emissão = distância_total × fator ÷ nº_de_ocupantes
passenger  → emissão = distância_total × fator          (sem divisão)

emissão_final = round(emissão × 10000) / 10000
```

E o próprio **fator** (kg CO₂e/km) de cada combustível vem de:

```
fator = (kg CO₂e por unidade de combustível) ÷ (km rodados por unidade)
```

---

## Fatores por VEÍCULO (`vehicle`) — divide pelos ocupantes

Aplicáveis a **carro, moto, van, aplicativo/táxi**.

| Modal | Combustível | Fator (kg CO₂e/km) | Cálculo do fator | Ref. |
|---|---|---|---|---|
| Carro | Gasolina | 0,187 | 2,212 kg CO₂e/L ÷ 11,8 km/L | R1 |
| Carro | Etanol | 0,036 | CO₂ biogênico neutro; só CH₄/N₂O ≈ 0,436 kg CO₂e/L ÷ 8,1 km/L | R1 |
| Carro | Diesel | 0,201 | 2,613 kg CO₂e/L ÷ 13 km/L | R1 |
| Carro | GNV | 0,152 | 2,03 kg CO₂e/m³ ÷ 13,4 km/m³ | R1 |
| Carro | Flex | 0,126 | média ponderada gasolina/etanol 60%/40% | R3 |
| Carro | Outro | 0,187 | assume gasolina (fallback conservador) | — |
| Moto | Gasolina | 0,071 | 2,212 kg CO₂e/L ÷ 31 km/L | R1 |
| Moto | Etanol | 0,016 | CH₄/N₂O residuais ÷ 27 km/L | R1 |
| Moto | Flex | 0,049 | média ponderada gasolina/etanol 60%/40% | — |
| Moto | Outro | 0,071 | assume gasolina (fallback conservador) | — |
| Van | Diesel | 0,278 | 2,613 kg CO₂e/L ÷ 9,4 km/L | R1 |
| Van | Gasolina | 0,295 | 2,212 kg CO₂e/L ÷ 7,5 km/L | R1 |
| Van | Outro | 0,278 | assume diesel (predominante em vans) | — |
| App/Táxi | Gasolina | 0,187 | mesmo fator do carro a gasolina | R1 |
| App/Táxi | Etanol | 0,036 | mesmo fator do carro a etanol | R1 |
| App/Táxi | GNV | 0,152 | mesmo fator do carro a GNV | R1 |
| App/Táxi | Flex | 0,126 | mesmo fator do carro flex | R3 |
| App/Táxi | Outro | 0,187 | assume gasolina (fallback conservador) | — |

**Emissão individual** = `distância_total × fator ÷ nº_de_ocupantes`

---

## Fatores por PASSAGEIRO (`passenger`) — não divide

Aplicáveis a **ônibus, avião, outro**. O fator já é por passageiro-km.

| Modal | Fator (kg CO₂e/km) | Cálculo / origem do fator | Ref. |
|---|---|---|---|
| Ônibus | 0,027 | DEFRA 2023, categoria *coach* (rodoviário/fretado), kg CO₂e por passageiro-km | R2 |
| Avião | 0,158 | DEFRA 2023, voo doméstico, kg CO₂e por passageiro-km (sem forçamento radiativo) | R2 |
| Outro | 0,100 | valor médio conservador entre modais motorizados (estimativa documentada) | — |

**Emissão individual** = `distância_total × fator`

---

## Emissão ZERO

| Modal | Fator | Cálculo |
|---|---|---|
| Bicicleta / A pé | 0 | deslocamento ativo — emissão direta considerada zero (*short-circuit*, sem conta) |

---

## Conversão em árvores (só no dashboard)

```
árvores = teto( total_co2e ÷ 163,14 )
```

163,14 kg CO₂ = absorção média estimada de **1 árvore nativa da Mata Atlântica
em ~20 anos**. Referência metodológica: R4.

> Fatores marcados com **—** em "Ref." são derivações internas (fallback ou média)
> a partir das referências R1–R3, sem link primário próprio.
