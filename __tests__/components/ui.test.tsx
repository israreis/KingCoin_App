import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { useState } from 'react';

import { CampoBusca, CampoMoeda, CampoSenha, Campo, Chips, RequisitosSenha } from '@/components/ui';

async function layout(elemento: Parameters<typeof fireEvent>[0], width: number) {
  await fireEvent(elemento, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 36 } } });
}

describe('Campo', () => {
  it('mostra o asterisco quando é obrigatório', async () => {
    await render(<Campo rotulo="Nome" value="" onChangeText={() => {}} obrigatorio />);
    expect(screen.getByText('*')).toBeTruthy();
  });

  it('não mostra asterisco em campo opcional', async () => {
    await render(<Campo rotulo="Apelido" value="" onChangeText={() => {}} />);
    expect(screen.queryByText('*')).toBeNull();
  });

  it('prioriza o erro sobre a mensagem de sucesso', async () => {
    await render(<Campo rotulo="X" value="" erro="Errado" sucesso="Certo" />);
    expect(screen.getByText('Errado')).toBeTruthy();
    expect(screen.queryByText('Certo')).toBeNull();
  });
});

describe('CampoMoeda', () => {
  function Teste() {
    const [valor, setValor] = useState('');
    return <CampoMoeda rotulo="Valor" value={valor} onChangeText={setValor} placeholder="0,00" />;
  }

  it('aplica a máscara enquanto digita', async () => {
    await render(<Teste />);
    await fireEvent.changeText(screen.getByPlaceholderText('0,00'), '12345');
    expect(screen.getByDisplayValue('123,45')).toBeTruthy();
  });

  it('usa teclado numérico', async () => {
    await render(<Teste />);
    expect(screen.getByPlaceholderText('0,00').props.keyboardType).toBe('number-pad');
  });
});

describe('CampoSenha', () => {
  it('começa escondida e o olho alterna a visibilidade', async () => {
    await render(<CampoSenha rotulo="Senha" value="Segredo!" onChangeText={() => {}} placeholder="senha" />);
    const campo = () => screen.getByPlaceholderText('senha');

    expect(campo().props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByLabelText('Mostrar senha'));
    expect(campo().props.secureTextEntry).toBe(false);
    await fireEvent.press(screen.getByLabelText('Esconder senha'));
    expect(campo().props.secureTextEntry).toBe(true);
  });
});

describe('RequisitosSenha', () => {
  it('marca cada regra conforme a senha', async () => {
    await render(<RequisitosSenha senha="abcdefgh" />);
    expect(screen.getByTestId('regra-tamanho-ok')).toBeTruthy();
    expect(screen.getByTestId('regra-maiuscula-pendente')).toBeTruthy();
    expect(screen.getByTestId('regra-especial-pendente')).toBeTruthy();
  });

  it('fica tudo verde com uma senha forte', async () => {
    await render(<RequisitosSenha senha="Senha@2026" />);
    for (const id of ['tamanho', 'maiuscula', 'especial']) {
      expect(screen.getByTestId(`regra-${id}-ok`)).toBeTruthy();
    }
  });
});

describe('CampoBusca', () => {
  it('só mostra o botão de limpar quando há texto, e ele limpa', async () => {
    const aoMudar = jest.fn();
    const { rerender } = await render(<CampoBusca value="" onChangeText={aoMudar} />);
    expect(screen.queryByLabelText('Limpar busca')).toBeNull();

    await rerender(<CampoBusca value="mercado" onChangeText={aoMudar} />);
    await fireEvent.press(screen.getByLabelText('Limpar busca'));
    expect(aoMudar).toHaveBeenCalledWith('');
  });
});

describe('Chips (filtros em uma linha)', () => {
  const opcoes = ['A', 'B', 'C', 'D'].map((t) => ({ id: t, texto: t }));

  /** Simula o layout: container com `largura` e cada opção com 80 px; botão "..." com 40 px. */
  async function medir(largura: number) {
    await layout(screen.getByTestId('chips'), largura);
    const medida = within(screen.getByTestId('chips-medida'));
    for (const o of opcoes) await layout(medida.getByRole('button', { name: o.texto }), 80);
    await layout(medida.getByLabelText(/Mostrar (mais|menos) opções/), 40);
  }

  const linha = () => within(screen.getByTestId('chips-linha'));

  it('chama onChange com o id tocado', async () => {
    const aoMudar = jest.fn();
    await render(<Chips opcoes={opcoes} valor="A" onChange={aoMudar} />);
    await medir(1000);
    await fireEvent.press(linha().getByText('C'));
    expect(aoMudar).toHaveBeenCalledWith('C');
  });

  it('sem botão de expandir quando tudo cabe', async () => {
    await render(<Chips opcoes={opcoes} valor="A" onChange={() => {}} />);
    await medir(400);
    expect(linha().queryByLabelText('Mostrar mais opções')).toBeNull();
    for (const o of opcoes) expect(linha().getByText(o.texto)).toBeTruthy();
  });

  it('mostra só o que cabe e o botão "..." quando não cabe', async () => {
    await render(<Chips opcoes={opcoes} valor="A" onChange={() => {}} />);
    await medir(260); // cabem A e B (168 px) + botão
    expect(linha().getByText('A')).toBeTruthy();
    expect(linha().getByText('B')).toBeTruthy();
    expect(linha().queryByText('C')).toBeNull();
    expect(linha().getByLabelText('Mostrar mais opções')).toBeTruthy();
  });

  it('expande e recolhe', async () => {
    await render(<Chips opcoes={opcoes} valor="A" onChange={() => {}} />);
    await medir(260);
    await fireEvent.press(linha().getByLabelText('Mostrar mais opções'));
    expect(linha().getByText('D')).toBeTruthy();
    await fireEvent.press(linha().getByLabelText('Mostrar menos opções'));
    expect(linha().queryByText('D')).toBeNull();
  });

  it('a opção selecionada nunca fica escondida', async () => {
    await render(<Chips opcoes={opcoes} valor="D" onChange={() => {}} />);
    await medir(260);
    expect(linha().getByText('D')).toBeTruthy();
    expect(linha().getByText('A')).toBeTruthy();
    expect(linha().queryByText('B')).toBeNull();
  });

  it('em tela muito estreita mostra ao menos a selecionada', async () => {
    await render(<Chips opcoes={opcoes} valor="C" onChange={() => {}} />);
    await medir(150);
    expect(linha().getByText('C')).toBeTruthy();
    expect(linha().queryByText('A')).toBeNull();
  });
});
