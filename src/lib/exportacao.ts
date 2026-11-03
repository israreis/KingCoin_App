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
      <style>
        body { font-family: Helvetica, Arial, sans-serif; color: #0c1a14; padding: 24px; }
        h1 { color: #1a9a70; margin: 0 0 4px; }
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
      <h1>KingCoin</h1>
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
    await Print.printAsync({ html });
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
