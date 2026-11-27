import { useId, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { matchCity, searchCities } from '../data/cities.js';

// Campo de cidade com busca (combobox ARIA): o participante digita e escolhe na lista
// de municípios da UF. O valor só é aceito quando é exatamente um município da lista
// (o mesmo que o <select> garantia), pois é ele que alimenta a estimativa de distância.
// Montado com key={uf}: trocar o estado recomeça o campo.
export default function CityPicker({ id, uf, value, onChange, invalid, describedBy }) {
  const listId = useId();
  const inputRef = useRef(null);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const results = open && uf && query.trim() ? searchCities(uf, query) : [];
  const showList = open && query.trim().length > 0;

  function type(e) {
    const text = e.target.value;
    setQuery(text);
    setOpen(true);
    setActive(-1);
    // digitou o nome exato (sem acento/caixa)? já vale; senão a cidade fica pendente
    const exact = matchCity(uf, text);
    if ((exact || '') !== value) onChange(exact || '');
  }

  function choose(name) {
    setQuery(name);
    setOpen(false);
    setActive(-1);
    if (name !== value) onChange(name);
    inputRef.current?.blur();
  }

  function keyDown(e) {
    if (!showList || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      const pick = active >= 0 ? results[active] : results.length === 1 ? results[0] : null;
      if (pick) {
        e.preventDefault();
        choose(pick);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function blur() {
    setOpen(false);
    if (value) setQuery(value); // mostra a grafia oficial (com acento)
  }

  // No celular o teclado cobre metade da tela: sobe o campo para a lista aparecer.
  function focus() {
    setOpen(true);
    if (window.matchMedia('(max-width: 640px)').matches) {
      setTimeout(() => inputRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 250);
    }
  }

  return (
    <div className="combo">
      <div className="input-affix">
        <input
          ref={inputRef} id={id} className="input"
          role="combobox" aria-autocomplete="list" aria-expanded={showList}
          aria-controls={listId} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-required="true" aria-invalid={invalid} aria-describedby={describedBy}
          value={query} onChange={type} onKeyDown={keyDown} onFocus={focus} onBlur={blur}
          disabled={!uf} maxLength={120}
          placeholder={uf ? 'Digite o nome da sua cidade' : 'Selecione o estado primeiro'}
          autoComplete="off" autoCorrect="off" autoCapitalize="words" spellCheck={false} enterKeyHint="done"
        />
        {value && <span className="affix affix-ok" aria-hidden="true"><Icon name="check" size={18} strokeWidth={2.6} /></span>}
      </div>

      <ul id={listId} role="listbox" className="combo-list" hidden={!showList} aria-label={`Cidades de ${uf}`}>
        {results.map((name, i) => (
          <li
            key={name} id={`${listId}-${i}`} role="option" aria-selected={name === value}
            className={`combo-option${i === active ? ' active' : ''}${name === value ? ' selected' : ''}`}
            // mousedown/pointerdown antes do blur: o toque escolhe sem o campo fechar a lista antes
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(name)}
          >
            <Icon name="pin" size={16} />
            <span>{name}</span>
            {name === value && <Icon name="check" size={16} className="combo-check" />}
          </li>
        ))}
        {showList && results.length === 0 && (
          <li className="combo-empty" role="option" aria-disabled="true" aria-selected="false">
            Nenhuma cidade encontrada em {uf}
          </li>
        )}
      </ul>
    </div>
  );
}
