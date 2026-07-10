import { useState } from 'react';
import CITIES_BY_UF from '../data/cities.json';

const UFS = Object.keys(CITIES_BY_UF);

export default function ParticipantForm({ initial, onNext, onBack }) {
  const [form, setForm] = useState(initial || {
    name: '', company: '', email: '', phone: '', city: '', state: '',
    consent_lgpd: false, consent_marketing: false,
  });
  const [errors, setErrors] = useState({});

  const cities = CITIES_BY_UF[form.state] || [];

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  // Trocar a UF invalida a cidade escolhida para a UF anterior.
  const setState = (e) => setForm((f) => ({ ...f, state: e.target.value, city: '' }));

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Informe seu nome';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Informe um e-mail válido';
    if (!form.state) errs.state = 'Selecione o estado';
    else if (!form.city) errs.city = 'Selecione sua cidade';
    if (!form.consent_lgpd) errs.consent_lgpd = 'É necessário aceitar para continuar';
    return errs;
  }

  function submit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onNext({
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim() || null,
      phone: form.phone.trim() || null,
      city: form.city.trim(),
    });
  }

  return (
    <form className="screen form" onSubmit={submit}>
      <h2>Seus dados</h2>

      <label>
        Nome*
        <input value={form.name} onChange={set('name')} autoComplete="off" maxLength={200} />
        {errors.name && <span className="error">{errors.name}</span>}
      </label>

      <label>
        Empresa / instituição
        <input value={form.company} onChange={set('company')} autoComplete="off" maxLength={200} />
      </label>

      <label>
        E-mail*
        <input type="email" value={form.email} onChange={set('email')} autoComplete="off" maxLength={200} inputMode="email" />
        {errors.email && <span className="error">{errors.email}</span>}
      </label>

      <label>
        Telefone (opcional)
        <input value={form.phone} onChange={set('phone')} autoComplete="off" maxLength={40} inputMode="tel" />
      </label>

      <div className="row">
        <label className="uf">
          Estado*
          <select value={form.state} onChange={setState}>
            <option value="">UF</option>
            {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
          {errors.state && <span className="error">{errors.state}</span>}
        </label>
        <label className="grow">
          Cidade de origem*
          <select value={form.city} onChange={set('city')} disabled={!form.state}>
            <option value="">{form.state ? 'Selecione a cidade' : 'Selecione o estado primeiro'}</option>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
          {errors.city && <span className="error">{errors.city}</span>}
        </label>
      </div>

      <label className="check">
        <input type="checkbox" checked={form.consent_lgpd} onChange={set('consent_lgpd')} />
        <span>
          <strong>Li e aceito</strong> que meus dados sejam usados para calcular a emissão de CO₂e
          e compor o relatório deste evento, conforme a LGPD.*
        </span>
      </label>
      {errors.consent_lgpd && <span className="error">{errors.consent_lgpd}</span>}

      <label className="check">
        <input type="checkbox" checked={form.consent_marketing} onChange={set('consent_marketing')} />
        <span>Aceito receber comunicações futuras dos organizadores. (opcional)</span>
      </label>

      <div className="nav-buttons">
        <button type="button" className="btn-secondary" onClick={onBack}>Cancelar</button>
        <button type="submit" className="btn-primary">Continuar →</button>
      </div>
    </form>
  );
}
