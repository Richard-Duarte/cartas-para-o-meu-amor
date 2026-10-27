import { createFileRoute, Link } from "@tanstack/react-router";
import { CONTACT_EMAIL, LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/privacidade")({
  head: () => ({ meta: [{ title: "Política de privacidade · Carta para o meu amor" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidade" updated="27 de outubro de 2026">
      <p>
        O Carta para o meu amor ("nós") leva cartas digitais de uma pessoa para outra. Esta política explica quais dados
        usamos, para quê e como você exerce seus direitos pela Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
      </p>

      <h2>Dados que coletamos</h2>
      <ul>
        <li>
          <strong>Conta:</strong> nome e e-mail. Se você entra com o Google, recebemos do Google só o nome, o e-mail e
          a foto do perfil (escopos <em>openid</em>, <em>email</em> e <em>profile</em>). Não temos acesso à sua senha do Google.
        </li>
        <li>
          <strong>Conteúdo da carta:</strong> o texto, o papel escolhido, o mensageiro e os nomes de quem envia e de
          quem recebe.
        </li>
        <li>
          <strong>Entrega e avisos:</strong> endereços (CEP, cidade, rua) quando você informa, para calcular o trajeto,
          e telefone ou e-mail para avisar da chegada.
        </li>
        <li>
          <strong>Pagamento:</strong> processado pelo Mercado Pago. Dados de cartão e de PIX ficam com o Mercado Pago;
          guardamos só o valor, o método, o status e o identificador do pagamento.
        </li>
        <li>
          <strong>Navegação e anúncios:</strong> usamos o Meta Pixel e parâmetros de campanha (utm, fbclid) para medir
          visitas e compras. O conteúdo das cartas nunca é enviado a esses serviços. E-mails, quando usados para medir
          conversões, vão criptografados (hash SHA-256).
        </li>
      </ul>

      <h2>Para que usamos</h2>
      <ul>
        <li>criar e manter sua conta, entregar a carta e mostrar o acompanhamento;</li>
        <li>avisar remetente e destinatário sobre a chegada;</li>
        <li>processar pagamentos, prevenir fraude e cumprir obrigações legais;</li>
        <li>medir e melhorar o site e os anúncios.</li>
      </ul>

      <h2>Com quem compartilhamos</h2>
      <p>
        Só com quem ajuda a operar o serviço: hospedagem e banco de dados (Vercel e Supabase), pagamento (Mercado Pago),
        login (Google), envio de avisos e medição (Meta). Não vendemos seus dados.
      </p>

      <h2>Por quanto tempo guardamos</h2>
      <p>
        Enquanto sua conta existir ou pelo tempo exigido por lei, no caso de registros de pagamento. Você pode pedir a
        exclusão a qualquer momento.
      </p>

      <h2>Seus direitos (LGPD)</h2>
      <p>
        Você pode confirmar se tratamos seus dados, acessá-los, corrigi-los, pedir a portabilidade, a anonimização ou a
        exclusão, revogar o consentimento e saber com quem os compartilhamos. Também pode reclamar à ANPD.
      </p>

      <h2>Contato</h2>
      <p>
        Escreva para <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Respondemos em até 15 dias.
      </p>
      <p>
        Veja também os <Link to="/termos">Termos de uso</Link>.
      </p>
    </LegalPage>
  );
}
