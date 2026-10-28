import { shareMeta } from "@/lib/share-meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CONTACT_EMAIL, LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso · Carta para o meu amor" },
      { name: "description", content: "Termos de Uso do Carta para o meu amor: como funcionam as cartas, os mensageiros, os pagamentos e a sua conta." },
      ...shareMeta({ title: "Termos de Uso · Carta para o meu amor", description: "Termos de Uso do Carta para o meu amor: como funcionam as cartas, os mensageiros, os pagamentos e a sua conta.", path: "/termos" }),
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <LegalPage title="Termos de Uso" updated="28 de outubro de 2026">
      <p>
        Estes Termos de Uso regem o uso do site Carta para o meu amor (cartas-para-o-meu-amor.vercel.app e
        cartaparaomeuamor.com.br). Ao criar uma conta, escrever, enviar, receber ou responder uma carta, você declara
        que leu e concorda com estes termos e com a <Link to="/privacidade">Política de Privacidade</Link>. Se não
        concordar, não use o serviço.
      </p>

      <h2>1. O serviço</h2>
      <ul>
        <li>
          O Carta para o meu amor permite escrever uma carta digital (texto, desenho e papel escolhido) e enviá-la a
          outra pessoa por um <strong>mensageiro virtual</strong>, como pombo-correio, cegonha, cisne, cavalo, jegue,
          tartaruga ou avião.
        </li>
        <li>
          Os mensageiros são personagens animados. <strong>Nenhum animal, objeto ou papel físico é enviado</strong>, e a
          entrega acontece só no ambiente digital.
        </li>
        <li>
          Cada mensageiro tem uma velocidade máxima de referência, informada em km/h (por exemplo, "até 95 km/h"),
          inspirada no animal ou veículo real. O trajeto e o tempo da viagem são calculados pelo site a partir dos
          endereços informados e do mensageiro escolhido, e o site mostra a previsão de chegada antes do pagamento.
        </li>
        <li>
          A previsão pode variar um pouco por motivos técnicos. Ela não é prazo de entrega postal nem de transporte
          físico.
        </li>
      </ul>

      <h2>2. Conta e acesso</h2>
      <ul>
        <li>
          Para enviar uma carta é preciso ter uma conta, criada com e-mail e senha ou com o login do Google. No login do
          Google recebemos só o nome, o e-mail e a foto do perfil, que pode aparecer como sua foto no site.
        </li>
        <li>
          Você é responsável por manter seus dados de acesso em segurança e por tudo o que for feito na sua conta.
          Avise-nos se suspeitar de uso indevido.
        </li>
        <li>
          Quem recebe uma carta também pode precisar entrar com uma conta para abri-la e acompanhá-la.
        </li>
        <li>Você deve ter 18 anos ou mais, ou usar o serviço com autorização dos seus responsáveis legais.</li>
      </ul>

      <h2>3. Cartas anônimas</h2>
      <ul>
        <li>
          Você pode enviar uma carta anônima, mediante a taxa mostrada no carrinho. Nela, seu nome não aparece para quem
          recebe ("Alguém especial"), a carta não usa endereço e chega em cerca de 2 horas pelo link e pela conta.
        </li>
        <li>
          O anonimato vale para quem recebe. Para cumprir a lei, guardamos os dados da sua conta e podemos
          fornecê-los às autoridades mediante ordem judicial ou requisição legal. O anonimato não protege conteúdo
          ilegal.
        </li>
      </ul>

      <h2>4. Respostas e comentários</h2>
      <ul>
        <li>
          Quem recebe pode responder com uma nova carta, que segue as mesmas regras de mensageiro e pagamento. A
          resposta a uma carta anônima também é anônima.
        </li>
        <li>
          Comentários deixados antes no acompanhamento da carta continuam visíveis para as pessoas da conversa. A opção
          de deixar novos comentários foi retirada.
        </li>
      </ul>

      <h2>5. Agendamento e avisos</h2>
      <ul>
        <li>Você pode marcar a data de chegada, mediante a taxa de agendamento mostrada no carrinho.</li>
        <li>
          Quando a carta está perto de chegar, enviamos avisos por e-mail e, se você informou o telefone, por
          WhatsApp, para você e para quem recebe.
        </li>
        <li>
          Você declara ter autorização para nos passar os contatos de quem recebe. Quem recebe pode pedir para não
          receber mais avisos.
        </li>
      </ul>

      <h2>6. Responsabilidades e conteúdo proibido</h2>
      <p>O conteúdo das cartas é de responsabilidade exclusiva de quem escreve. É proibido usar o serviço para:</p>
      <ul>
        <li>assediar, ameaçar, perseguir, intimidar ou constranger alguém, inclusive com cartas anônimas;</li>
        <li>enviar conteúdo de ódio, discriminatório, violento, difamatório ou que incentive crimes;</li>
        <li>enviar conteúdo sexual envolvendo menores de idade, em qualquer hipótese;</li>
        <li>enviar conteúdo sexual explícito a quem não consentiu;</li>
        <li>violar direitos autorais, de imagem ou de privacidade de terceiros;</li>
        <li>enviar spam, golpes, links maliciosos ou se passar por outra pessoa;</li>
        <li>burlar pagamentos, cupons, créditos ou o programa de indicação, ou atacar o funcionamento do site.</li>
      </ul>
      <p>
        Podemos remover conteúdo, interromper entregas e suspender ou encerrar contas que violem estes termos, sem
        prejuízo de comunicar as autoridades quando a lei exigir. Para denunciar uma carta, escreva para {mail}.
      </p>

      <h3>Moderação e bloqueio de contas</h3>
      <ul>
        <li>
          Para garantir a segurança, prevenir abusos e cumprir a lei, a nossa equipe pode ler e guardar o conteúdo das
          cartas (texto, imagens e comentários), inclusive das anônimas, quando houver denúncia, suspeita de uso
          indevido ou ordem legal. Cada leitura feita pela equipe fica registrada.
        </li>
        <li>
          Uma conta que viole estes termos pode ser <strong>bloqueada</strong>. Quem é bloqueado vê o motivo ao entrar
          no site e não pode escrever, enviar nem pagar cartas enquanto o bloqueio durar.
        </li>
        <li>
          Enquanto a conta estiver bloqueada, <strong>todas as cartas enviadas por ela saem do ar</strong>, inclusive as
          que estão a caminho: quem tem o link vê apenas que a carta não está disponível, e os avisos de chegada param.
          As cartas não são apagadas. Se a conta for desbloqueada, elas voltam como eram.
        </li>
        <li>
          Você pode contestar o bloqueio pelo botão <strong>"Reivindicar acesso"</strong>, que aparece na tela de
          bloqueio, ou escrevendo para {mail}. Respondemos pelo próprio site.
        </li>
      </ul>

      <h2>7. Preços e pagamento</h2>
      <ul>
        <li>
          O preço depende do mensageiro e dos adicionais escolhidos (papel, carta anônima, agendamento). Ele aparece no
          carrinho antes do pagamento, em reais e com centavos. Uma mudança de preço vale só para cartas novas: a carta já
          enviada mantém o valor pago.
        </li>
        <li>
          Os pagamentos são processados pelo <strong>Mercado Pago</strong>, por PIX ou cartão de crédito, com
          parcelamento quando disponível. Os dados do cartão e do PIX são tratados pelo Mercado Pago e não ficam
          guardados no nosso site.
        </li>
        <li>
          A carta <strong>só é criada e só parte depois que o pagamento é aprovado</strong>. O código PIX vale por 30
          minutos; se expirar ou for recusado, nada é cobrado e nenhuma carta é enviada.
        </li>
        <li>
          Cupons de desconto e créditos de indicação podem reduzir ou zerar o valor, conforme as condições mostradas
          no site. Créditos não são convertidos em dinheiro, salvo as comissões do programa de indicação, pagas conforme
          as regras da sua conta (valor mínimo para saque).
        </li>
        <li>
          <strong>Cupom AMOR</strong>: deixa o segundo envio da conta grátis (mensageiro, papel e adicionais). Precisa
          estar logado, vale uma vez por conta e só depois de a conta ter enviado ao menos uma carta. Não se soma a
          comissão de indicação e pode ser encerrado a qualquer momento, sem afetar envios já feitos.
        </li>
      </ul>

      <h2>8. Cancelamento e reembolso</h2>
      <ul>
        <li>
          A carta é um conteúdo digital entregue logo após a aprovação do pagamento: ela parte e passa a ser
          acompanhada na hora. Por isso, o site não tem um botão de cancelar uma carta já enviada.
        </li>
        <li>
          Pelo Código de Defesa do Consumidor (art. 49), você pode pedir o arrependimento em até 7 dias da compra. Basta
          escrever para {mail} com o e-mail da conta e a identificação da carta. Avaliamos cada pedido e, quando
          cabível, fazemos o estorno pelo Mercado Pago, no mesmo meio de pagamento.
        </li>
        <li>
          Se houver cobrança em duplicidade, falha técnica que impeça a entrega ou cobrança de uma carta que não foi
          criada, fazemos o reembolso integral.
        </li>
        <li>
          Cartas removidas por violar estes termos não dão direito a reembolso, salvo quando a lei determinar o
          contrário.
        </li>
      </ul>

      <h2>9. Propriedade intelectual</h2>
      <ul>
        <li>
          A marca Carta para o meu amor, o site, os mensageiros, as ilustrações, os modelos 3D, os papéis, os textos e o
          software são nossos ou licenciados para nós, e não podem ser copiados nem usados sem autorização.
        </li>
        <li>
          O texto que você escreve continua seu. Você nos dá uma licença limitada para guardar, exibir e entregar a carta
          a quem você escolheu, só para prestar o serviço. Não publicamos suas cartas.
        </li>
      </ul>

      <h2>10. Limitação de responsabilidade</h2>
      <ul>
        <li>
          Nos esforçamos para manter o site disponível e seguro, mas ele pode ter interrupções, atrasos ou erros por
          manutenção, falhas de terceiros (hospedagem, pagamento, e-mail, WhatsApp) ou força maior.
        </li>
        <li>
          Não respondemos pelo conteúdo escrito pelos usuários, pela reação de quem recebe, nem por avisos não recebidos
          por causa de contato informado errado.
        </li>
        <li>Nada nestes termos limita direitos que o Código de Defesa do Consumidor garante a você.</li>
      </ul>

      <h2>11. Privacidade e LGPD</h2>
      <p>
        Tratamos dados pessoais conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018). O que coletamos, para que
        usamos, com quem compartilhamos e como exercer seus direitos de acesso, correção, exclusão e portabilidade
        está na <Link to="/privacidade">Política de Privacidade</Link>.
      </p>

      <h2>12. Mudanças nos termos</h2>
      <p>
        Podemos atualizar estes termos para refletir mudanças no serviço ou na lei. A data no topo indica a versão em
        vigor. Mudanças importantes serão avisadas no site, e continuar usando o serviço depois disso significa aceitar a
        nova versão.
      </p>

      <h2>13. Lei aplicável e foro</h2>
      <p>
        Estes termos seguem as leis da República Federativa do Brasil. Fica eleito o foro do domicílio do consumidor
        para resolver qualquer controvérsia, conforme o Código de Defesa do Consumidor.
      </p>

      <h2>14. Contato</h2>
      <p>Dúvidas, denúncias, pedidos de reembolso ou sobre seus dados: {mail}.</p>
    </LegalPage>
  );
}
