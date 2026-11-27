import Icon from '../components/Icon.jsx';
import StepLayout from '../components/StepLayout.jsx';

// Depois de "Finalizar": a sessão já foi limpa (nenhum dado pessoal fica na tela).
// No celular a pessoa simplesmente fecha a página; "Nova resposta" serve a quem
// for responder no mesmo aparelho.
export default function DoneScreen({ online, pending, onNew }) {
  const waiting = pending > 0;
  return (
    <StepLayout
      screen="done" title="Obrigado por participar" pose="acenando"
      bubble={{ title: 'Obrigada por participar!', text: 'Cada escolha conta para um evento mais sustentável.' }}
      actions={
        <button type="button" className="btn btn-outline btn-lg" onClick={onNew}>
          <Icon name="refresh" /> Nova resposta
        </button>
      }
    >
      <div className="done-panel">
        <span className="done-badge" aria-hidden="true"><Icon name={waiting ? 'clock' : 'check'} size={34} strokeWidth={2.6} /></span>
        <h2>{waiting ? 'Resposta salva' : 'Resposta registrada'}</h2>
        <p>Você já pode fechar esta página.</p>
        {waiting && (
          <p className="note">
            <Icon name="info" size={20} />
            <span>
              {online
                ? (pending === 1 ? 'Uma resposta está sendo enviada' : `${pending} respostas estão sendo enviadas`) + ' deste aparelho.'
                : 'Sem internet agora: a resposta fica salva neste aparelho e é enviada quando a conexão voltar com esta página aberta. Se fechar, abra o link do evento de novo quando tiver internet.'}
            </span>
          </p>
        )}
      </div>
    </StepLayout>
  );
}
