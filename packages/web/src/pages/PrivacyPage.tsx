import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div className="relative z-10 max-w-[680px] mx-auto px-5 py-10 pb-20">
      <header className="text-center mb-10">
        <Link to="/" className="inline-flex flex-col items-center gap-2 mb-5 hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="Soberano Barbearia" className="w-16 h-16 object-contain" />
          <span className="font-serif text-[15px] tracking-[0.25em] uppercase text-gold">Soberano Barbearia</span>
        </Link>
        <h1 className="font-serif text-[clamp(24px,5vw,36px)] font-black leading-[1.1]">
          Política de <em className="not-italic text-gold">Privacidade</em>
        </h1>
      </header>

      <div className="space-y-6 text-[14px] leading-relaxed text-muted">
        <section>
          <h2 className="text-white font-bold text-[15px] mb-2">1. Quem somos</h2>
          <p>
            Soberano Barbearia, estabelecimento físico localizado no Brasil, responsável pelo tratamento dos dados
            coletados por meio deste sistema de agendamento.
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold text-[15px] mb-2">2. Dados coletados</h2>
          <p>Coletamos apenas os dados estritamente necessários para realizar o agendamento:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong className="text-white">Nome completo</strong> — para identificação no atendimento</li>
            <li><strong className="text-white">Número de WhatsApp</strong> — para envio da confirmação e lembretes do agendamento</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-bold text-[15px] mb-2">3. Finalidade do uso</h2>
          <p>Seus dados são utilizados exclusivamente para:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Confirmar o agendamento via WhatsApp</li>
            <li>Enviar lembrete 1 hora antes do horário</li>
            <li>Permitir cancelamento ou reagendamento</li>
          </ul>
          <p className="mt-2">Não utilizamos seus dados para fins comerciais, marketing ou compartilhamento com terceiros.</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-[15px] mb-2">4. Base legal (LGPD)</h2>
          <p>
            O tratamento dos dados é fundamentado no <strong className="text-white">Art. 7º, V da Lei 13.709/2018 (LGPD)</strong> —
            execução de contrato ou procedimentos preliminares a pedido do titular — e no legítimo interesse do estabelecimento
            para prestação do serviço solicitado.
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold text-[15px] mb-2">5. Retenção dos dados</h2>
          <p>
            Os dados são mantidos pelo tempo necessário para a prestação do serviço e cumprimento de eventuais
            obrigações legais, sendo excluídos quando não houver mais finalidade que justifique o tratamento.
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold text-[15px] mb-2">6. Seus direitos</h2>
          <p>De acordo com a LGPD, você tem direito a:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Confirmar a existência de tratamento dos seus dados</li>
            <li>Solicitar acesso, correção ou exclusão dos seus dados</li>
            <li>Revogar o consentimento a qualquer momento</li>
          </ul>
          <p className="mt-2">
            Para exercer seus direitos, entre em contato pelo WhatsApp da barbearia durante o horário de atendimento.
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold text-[15px] mb-2">7. Segurança</h2>
          <p>
            Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado,
            incluindo comunicação criptografada (HTTPS) e armazenamento seguro em servidor dedicado.
          </p>
        </section>

        <section>
          <h2 className="text-white font-bold text-[15px] mb-2">8. Contato</h2>
          <p>
            Dúvidas sobre esta política podem ser enviadas diretamente para a barbearia via WhatsApp.
          </p>
        </section>

        <p className="text-[12px] opacity-50 pt-4 border-t border-white/10">
          Última atualização: março de 2026
        </p>
      </div>

      <div className="mt-10 text-center">
        <Link
          to="/"
          className="inline-block bg-gold text-dark font-bold text-[14px] px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
        >
          ← Voltar para o início
        </Link>
      </div>
    </div>
  );
}
