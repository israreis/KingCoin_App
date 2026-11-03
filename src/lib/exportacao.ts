import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

import type { Movimentacao } from '@/types';

import { dataBR, hojeISO, moeda } from './format';
import { totaisPorTipo } from './saldos';
import { TEXTO_TIPO } from './theme';

type Parametros = {
  movimentacoes: Movimentacao[];
  inicio: string;
  fim: string;
  usuario: string;
};

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Logo do KingCoin em SVG, embutido no PDF (funciona no celular e no navegador). */
const LOGO_SVG = `<svg class="logo" viewBox="0 0 809.29 923.28" xmlns="http://www.w3.org/2000/svg" fill="#1a9a70">
  <polygon points="156.26 669.57 347.34 781.62 347.34 923.28 0 923.28 0 301.67 154.35 391.44 156.26 669.57"/>
  <polygon points="654.93 391.44 809.28 301.67 809.28 923.28 461.94 923.28 461.94 781.62 653.02 669.57 654.93 391.44"/>
  <polygon points="809.29 113.99 809.29 171.76 541.81 323.52 540.32 599.76 404.64 677.58 268.94 599.76 267.48 323.52 0 171.76 0 113.99 113.99 0 227.99 113.99 290.65 113.99 404.64 0 518.64 113.99 581.3 113.99 695.29 0 809.29 113.99"/>
</svg>`;

type ElementoWeb = {
  style: Record<string, string>;
  srcdoc: string;
  onload: (() => void) | null;
  remove: () => void;
  contentWindow: {
    focus: () => void;
    print: () => void;
    addEventListener: (evento: string, fn: () => void) => void;
  } | null;
};

/**
 * Na web, o `Print.printAsync` do expo-print imprime a página atual e ignora o HTML.
 * Por isso o relatório é carregado num iframe invisível e impresso de lá: o navegador
 * abre a janela de impressão com a opção "Salvar como PDF", com o mesmo modelo do celular.
 */
function imprimirNoNavegador(html: string): Promise<void> {
  const doc = (globalThis as unknown as {
    document?: { createElement: (tag: string) => ElementoWeb; body: { appendChild: (el: ElementoWeb) => void } };
  }).document;
  if (!doc) return Promise.reject(new Error('Impressão indisponível neste navegador.'));

  return new Promise((resolve, reject) => {
    const iframe = doc.createElement('iframe');
    Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });

    let terminou = false;
    const limpar = () => {
      if (terminou) return;
      terminou = true;
      setTimeout(() => iframe.remove(), 500);
      resolve();
    };

    iframe.onload = () => {
      const janela = iframe.contentWindow;
      if (!janela) {
        iframe.remove();
        reject(new Error('Não foi possível gerar o PDF.'));
        return;
      }
      janela.addEventListener('afterprint', limpar);
      janela.focus();
      janela.print();
      // Alguns navegadores não disparam "afterprint"; garante a limpeza.
      setTimeout(limpar, 60_000);
    };
    iframe.srcdoc = html;
    doc.body.appendChild(iframe);
  });
}

async function compartilhar(uri: string, mimeType: string, uti: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('O compartilhamento de arquivos não está disponível neste aparelho.');
  }
  await Sharing.shareAsync(uri, { mimeType, UTI: uti, dialogTitle: 'Relatório KingCoin' });
}

export async function exportarPdf({ movimentacoes, inicio, fim, usuario }: Parametros) {
  const totais = totaisPorTipo(movimentacoes);

  const linhas = movimentacoes
    .map(
      (m) => `
      <tr>
        <td>${dataBR(m.data)}</td>
        <td>${escapar(m.descricao ?? '-')}</td>
        <td>${escapar(m.categorias.nome)}</td>
        <td>${TEXTO_TIPO[m.categorias.tipo]}</td>
        <td class="valor">${moeda(m.valor)}</td>
      </tr>`,
    )
    .join('');

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Relatório KingCoin ${dataBR(inicio)} a ${dataBR(fim)}</title>
      <style>
        @page { size: A4; margin: 16mm; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: Helvetica, Arial, sans-serif; color: #0c1a14; padding: 24px; margin: 0; }
        .topo { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
        .logo { width: 40px; height: 46px; }
        h1 { color: #1a9a70; margin: 0; }
        .sub { color: #5d7468; margin-bottom: 20px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #1a9a70; color: #fff; text-align: left; padding: 8px; }
        td { padding: 7px 8px; border-bottom: 1px solid #d5e3dc; }
        td.valor { text-align: right; white-space: nowrap; }
        .resumo { margin-top: 24px; font-size: 13px; }
        .resumo td { border: none; padding: 4px 8px; }
        .rodape { margin-top: 28px; color: #5d7468; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="topo">${LOGO_SVG}<h1>KingCoin</h1></div>
      <div class="sub">Relatório de ${dataBR(inicio)} a ${dataBR(fim)}</div>
      <table>
        <thead>
          <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th></tr>
        </thead>
        <tbody>${linhas || '<tr><td colspan="5">Nenhuma movimentação no período.</td></tr>'}</tbody>
      </table>
      <table class="resumo" style="width: 280px;">
        <tr><td>Receitas</td><td class="valor">${moeda(totais.receitas)}</td></tr>
        <tr><td>Despesas</td><td class="valor">${moeda(totais.despesas)}</td></tr>
        <tr><td>Economia</td><td class="valor">${moeda(totais.economia)}</td></tr>
        <tr><td><b>Saldo</b></td><td class="valor"><b>${moeda(totais.receitas - totais.despesas)}</b></td></tr>
      </table>
      <div class="rodape">Gerado para ${escapar(usuario)} em ${dataBR(hojeISO())}</div>
    </body>
  </html>`;

  // Na web abre a impressão do navegador, onde dá para salvar como PDF.
  if (Platform.OS === 'web') {
    await imprimirNoNavegador(html);
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  await compartilhar(uri, 'application/pdf', 'com.adobe.pdf');
}

export async function exportarExcel({ movimentacoes, inicio, fim, usuario }: Parametros) {
  const totais = totaisPorTipo(movimentacoes);

  const linhas: (string | number)[][] = [
    ['KingCoin - Relatório financeiro'],
    [`Período: ${dataBR(inicio)} a ${dataBR(fim)}`],
    [`Usuário: ${usuario}`],
    [],
    ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor (R$)'],
    ...movimentacoes.map((m) => [
      dataBR(m.data),
      m.descricao ?? '',
      m.categorias.nome,
      TEXTO_TIPO[m.categorias.tipo],
      m.valor,
    ]),
    [],
    ['Receitas', '', '', '', totais.receitas],
    ['Despesas', '', '', '', totais.despesas],
    ['Economia', '', '', '', totais.economia],
    ['Saldo', '', '', '', totais.receitas - totais.despesas],
  ];

  const planilha = XLSX.utils.aoa_to_sheet(linhas);
  planilha['!cols'] = [{ wch: 12 }, { wch: 34 }, { wch: 20 }, { wch: 12 }, { wch: 14 }];

  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, 'Movimentações');

  // Na web o navegador baixa o arquivo direto.
  if (Platform.OS === 'web') {
    XLSX.writeFile(livro, `kingcoin-${inicio}_${fim}.xlsx`);
    return;
  }

  const base64 = XLSX.write(livro, { type: 'base64', bookType: 'xlsx' });
  const caminho = `${FileSystem.cacheDirectory}kingcoin-${inicio}_${fim}.xlsx`;
  await FileSystem.writeAsStringAsync(caminho, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await compartilhar(
    caminho,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'org.openxmlformats.spreadsheetml.sheet',
  );
}
