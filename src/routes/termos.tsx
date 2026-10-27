import { createFileRoute, Link } from "@tanstack/react-router";
import { CONTACT_EMAIL, LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/termos")({
  head: () => ({ meta: [{ title: "Termos de uso · Carta para o meu amor" }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Termos de uso" updated="27 de outubro de 2026">
      <p>Ao usar o Carta para o meu amor você concorda com estes termos.</p>

      <h2>O serviço</h2>
      <p>
        Você escreve uma carta digital, escolhe um mensageiro e envia. A carta chega no tempo da viagem mostrada no site
        e quem recebe abre pelo link ou pela conta. Os mensageiros e o trajeto são uma experiência ilustrativa: nenhum
        animal ou objeto físico é enviado.
      </p>

      <h2>Sua conta</h2>
      <p>
        Você é responsável pelo acesso à sua conta, seja por e-mail e senha ou pelo Google, e pelas informações que
        fornece.
      </p>

      <h2>Conteúdo</h2>
      <p>
        O texto das cartas é seu. Não envie conteúdo ilegal, ofensivo, que assedie alguém ou que viole direitos de
        terceiros. Podemos remover conteúdo e suspender contas que desrespeitem estes termos.
      </p>

      <h2>Pagamentos</h2>
      <p>
        Os preços aparecem antes do pagamento, que é processado pelo Mercado Pago (PIX ou cartão). A carta só sai depois
        do pagamento aprovado. Se algo der errado com a entrega, fale com a gente para avaliarmos o reembolso, conforme o
        Código de Defesa do Consumidor.
      </p>

      <h2>Privacidade</h2>
      <p>
        O uso dos seus dados está na <Link to="/privacidade">Política de privacidade</Link>.
      </p>

      <h2>Mudanças e contato</h2>
      <p>
        Podemos atualizar estes termos; a data no topo mostra a versão atual. Dúvidas:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
