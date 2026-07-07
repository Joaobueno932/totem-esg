# Cálculo de emissão — detalhamento por tipo

Este documento descreve **exatamente** a conta feita pelo sistema para cada
tipo de deslocamento, com os fatores da versão **`1.0.0-2026.07`** e exemplos
numéricos passo a passo.

O motor de cálculo é o mesmo no totem (offline, [totem/src/emissions/calc.js](../totem/src/emissions/calc.js))
e no servidor ([backend/src/services/emissions.js](../backend/src/services/emissions.js)).
O servidor **recalcula** toda resposta recebida e o valor dele prevalece.

---

## 1. Fórmula geral

Toda emissão individual sai da mesma base:

```
distância_total   = round_trip ? distância_km × 2 : distância_km
emissão_bruta_kg  = distância_total × fator_kg_co2e_por_km
```

Depois, **conforme a base do fator** (`factor_basis`), aplica-se ou não a
divisão por ocupantes:

```
factor_basis = "vehicle"   → emissão = emissão_bruta ÷ nº_de_ocupantes
factor_basis = "passenger" → emissão = emissão_bruta            (sem divisão)
```

O resultado final é arredondado para **4 casas decimais**:

```
emissão_final = round(emissão × 10000) / 10000
```

Referência no código: [calc.js:34-51](../totem/src/emissions/calc.js#L34-L51) e
[emissions.js:39-53](../backend/src/services/emissions.js#L39-L53).

---

## 2. Tipos com fator **por veículo** (`vehicle`)

Aplicáveis a: **carro, moto, van, aplicativo/táxi**. O participante informa o
**combustível** e o **nº de ocupantes**; a emissão do veículo é **rateada entre
todos os ocupantes**.

```
emissão_individual = (distância_total × fator_do_combustível) ÷ nº_de_ocupantes
```

> Se o combustível não for informado (ou não existir na base para aquele modal),
> usa-se o fator `"outro"` do próprio modal como fallback conservador
> ([emissions.js:27-31](../backend/src/services/emissions.js#L27-L31)).

### Fatores (kg CO₂e/km)

| Modal | Combustível | Fator | Derivação |
|---|---|---|---|
| Carro | Gasolina | 0,187 | 2,212 kg CO₂e/L ÷ 11,8 km/L |
| Carro | Etanol | 0,036 | CO₂ biogênico neutro; CH₄/N₂O residuais ≈0,436 kg CO₂e/L ÷ 8,1 km/L |
| Carro | Diesel | 0,201 | 2,613 kg CO₂e/L ÷ 13 km/L |
| Carro | GNV | 0,152 | 2,03 kg CO₂e/m³ ÷ 13,4 km/m³ |
| Carro | Flex | 0,126 | média ponderada gasolina/etanol 60/40 (perfil ANP) |
| Carro | Outro | 0,187 | assume gasolina (conservador) |
| Moto | Gasolina | 0,071 | 2,212 kg CO₂e/L ÷ 31 km/L |
| Moto | Etanol | 0,016 | análogo ao carro etanol, 27 km/L |
| Moto | Flex | 0,049 | média 60/40 |
| Moto | Outro | 0,071 | assume gasolina |
| Van | Diesel | 0,278 | 2,613 kg CO₂e/L ÷ 9,4 km/L |
| Van | Gasolina | 0,295 | 2,212 kg CO₂e/L ÷ 7,5 km/L |
| Van | Outro | 0,278 | assume diesel (predominante em vans) |
| App/Táxi | Gasolina | 0,187 | mesmo fator do carro a gasolina |
| App/Táxi | Etanol | 0,036 | mesmo fator do carro a etanol |
| App/Táxi | GNV | 0,152 | mesmo fator do carro a GNV |
| App/Táxi | Flex | 0,126 | mesmo fator do carro flex |
| App/Táxi | Outro | 0,187 | assume gasolina |

### Exemplo A — Carro a gasolina, ida e volta, 3 ocupantes

Participante mora a **20 km** do evento, vai de **carro a gasolina**, marca
**ida e volta** e informa **3 pessoas** no carro.

```
distância_total = 20 × 2                = 40 km
emissão_bruta   = 40 × 0,187            = 7,48 kg CO₂e   (emissão do carro)
emissão_indiv.  = 7,48 ÷ 3             ≈ 2,4933 kg CO₂e  (por pessoa)
```

**Resultado registrado para esse participante: 2,4933 kg CO₂e.**

### Exemplo B — Moto a gasolina, só ida, 1 ocupante

Mora a **15 km**, vai de **moto**, **só ida**, sozinho.

```
distância_total = 15                    = 15 km
emissão_bruta   = 15 × 0,071            = 1,065 kg CO₂e
emissão_indiv.  = 1,065 ÷ 1             = 1,065 kg CO₂e
```

**Resultado: 1,065 kg CO₂e.**

---

## 3. Tipos com fator **por passageiro** (`passenger`)

Aplicáveis a: **ônibus, avião, outro**. O fator já é expresso **por
passageiro-km**, então **não** há divisão por ocupantes nem escolha de
combustível.

```
emissão_individual = distância_total × fator_por_passageiro_km
```

### Fatores (kg CO₂e/km)

| Modal | Fator | Base | Fonte |
|---|---|---|---|
| Ônibus | 0,027 | passageiro | DEFRA UK 2023, categoria *coach* (rodoviário/fretado) |
| Avião | 0,158 | passageiro | DEFRA UK 2023, voo doméstico, sem forçamento radiativo |
| Outro | 0,100 | passageiro | valor médio conservador entre modais motorizados |

### Exemplo C — Ônibus, ida e volta, 120 km por trecho

```
distância_total = 120 × 2               = 240 km
emissão         = 240 × 0,027           = 6,48 kg CO₂e
```

**Resultado: 6,48 kg CO₂e** (o nº de pessoas no ônibus é irrelevante — o fator
já é por passageiro).

### Exemplo D — Avião, só ida, 500 km

```
distância_total = 500                   = 500 km
emissão         = 500 × 0,158           = 79,0 kg CO₂e
```

**Resultado: 79,0 kg CO₂e.**

---

## 4. Tipo com emissão **zero**

**Bicicleta / A pé** — deslocamento ativo, emissão direta considerada **zero**.
O cálculo faz *short-circuit* antes de qualquer conta
([calc.js:35](../totem/src/emissions/calc.js#L35)):

```
emissão = 0   (independente de distância, ida/volta ou ocupantes)
```

---

## 5. Recálculo e validação no servidor

Ao sincronizar, o servidor **refaz a conta** com os fatores ativos e grava o
valor dele. Se o valor enviado pelo cliente divergir em **mais de 0,5 kg**, a
resposta é marcada como `recalculated` em `sync_logs`
([sync.js:87-109](../backend/src/routes/sync.js#L87-L109)):

```
mismatch = | emissão_servidor − emissão_cliente | > 0,5 kg
```

O valor persistido em `transport_answers.emission_kg_co2e` é **sempre o do
servidor**, junto com a `calculation_version` usada — garantindo
rastreabilidade histórica dos números.

---

## 6. Agregações do dashboard / relatório

Sobre o conjunto de respostas de um evento
([admin.js:110-134](../backend/src/routes/admin.js#L110-L134)):

```
total_co2e    = Σ emissão de todas as respostas
avg_co2e      = média das emissões por participante
por_modal     = Σ emissão agrupada por transport_mode
% do modal    = co2e_do_modal ÷ total_co2e × 100
```

### Conversão em árvores (só no dashboard, nunca exibida ao participante)

```
árvores = teto( total_co2e ÷ 163,14 )
```

163,14 kg CO₂ é a absorção média estimada de **uma árvore nativa da Mata
Atlântica ao longo de ~20 anos**. Usa-se `Math.ceil` (arredonda **para cima**),
pois neutralizar exige plantar a árvore inteira
([admin.js:133](../backend/src/routes/admin.js#L133)).

### Exemplo E — Evento com 3 participantes

Somando os exemplos A (2,4933), C (6,48) e um terceiro qualquer que totalize
**10,075 kg CO₂e** no evento:

```
total_co2e = 10,075 kg CO₂e
árvores    = teto(10,075 ÷ 163,14) = teto(0,0618) = 1 árvore
```

---

## 7. Resumo — qual conta cada tipo usa

| Tipo | Escolhe combustível? | Divide por ocupantes? | Fórmula |
|---|:---:|:---:|---|
| Carro | ✅ | ✅ | `dist × fator_combustível ÷ ocupantes` |
| Moto | ✅ | ✅ | `dist × fator_combustível ÷ ocupantes` |
| Van | ✅ | ✅ | `dist × fator_combustível ÷ ocupantes` |
| App/Táxi | ✅ | ✅ | `dist × fator_combustível ÷ ocupantes` |
| Ônibus | ❌ | ❌ | `dist × 0,027` |
| Avião | ❌ | ❌ | `dist × 0,158` |
| Outro | ❌ | ❌ | `dist × 0,100` |
| Bicicleta / A pé | ❌ | ❌ | `0` |

> `dist` = distância já considerando ida e volta (`× 2` quando `round_trip`).

Fontes primárias dos fatores: Programa Brasileiro GHG Protocol (FGV/MCTI) para
combustíveis; DEFRA UK *GHG Conversion Factors 2023* para fatores por
passageiro-km. Metodologia inspirada na calculadora pública da Fundação SOS
Mata Atlântica. Ver [docs/metodologia.md](metodologia.md) e
[backend/seeds/emission_factors.json](../backend/seeds/emission_factors.json)
(fonte da verdade, com fonte documentada por fator).
