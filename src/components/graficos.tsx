import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Polyline, Rect, Text as SvgTexto } from 'react-native-svg';

import { moeda } from '@/lib/format';
import { COR_TIPO, useTema } from '@/lib/theme';

export const PALETA = [
  '#23b785', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899', '#84cc16',
];

// --- Linha: evolução da carteira -------------------------------------------

export function GraficoLinha({ labels, valores }: { labels: string[]; valores: number[] }) {
  const { cores } = useTema();
  const [largura, setLargura] = useState(0);

  const altura = 190;
  const margem = { esq: 12, dir: 12, topo: 22, base: 26 };

  const maximo = Math.max(0, ...valores);
  const minimo = Math.min(0, ...valores);
  const faixa = maximo - minimo || 1;

  const x = (i: number) =>
    margem.esq +
    (valores.length <= 1 ? 0 : (i * (largura - margem.esq - margem.dir)) / (valores.length - 1));
  const y = (v: number) =>
    margem.topo + ((maximo - v) / faixa) * (altura - margem.topo - margem.base);

  const pontos = valores.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const ultimo = valores.length - 1;

  return (
    <View onLayout={(e) => setLargura(e.nativeEvent.layout.width)}>
      {largura > 0 ? (
        <Svg width={largura} height={altura}>
          <Line
            x1={margem.esq}
            x2={largura - margem.dir}
            y1={y(0)}
            y2={y(0)}
            stroke={cores.borda}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <Polyline
            points={pontos}
            fill="none"
            stroke={cores.primaria}
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {valores.map((v, i) => (
            <Circle key={i} cx={x(i)} cy={y(v)} r={4} fill={cores.primaria} />
          ))}
          {labels.map((label, i) => (
            <SvgTexto
              key={label + i}
              x={x(i)}
              y={altura - 6}
              fontSize={11}
              fill={cores.suave}
              textAnchor="middle"
            >
              {label}
            </SvgTexto>
          ))}
          {ultimo >= 0 ? (
            <SvgTexto
              x={Math.min(x(ultimo), largura - 40)}
              y={Math.max(y(valores[ultimo]) - 10, 12)}
              fontSize={11}
              fontWeight="bold"
              fill={cores.texto}
              textAnchor="middle"
            >
              {moeda(valores[ultimo])}
            </SvgTexto>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

// --- Rosca: despesas/receitas por categoria --------------------------------

type Fatia = { nome: string; valor: number };

export function GraficoRosca({ dados, vazio }: { dados: Fatia[]; vazio: string }) {
  const { cores } = useTema();
  const total = dados.reduce((soma, d) => soma + d.valor, 0);

  if (total <= 0) {
    return <Text style={{ color: cores.suave, textAlign: 'center', paddingVertical: 16 }}>{vazio}</Text>;
  }

  const tamanho = 170;
  const traco = 28;
  const raio = (tamanho - traco) / 2;
  const circunferencia = 2 * Math.PI * raio;

  let acumulado = 0;
  const arcos = dados.map((d, i) => {
    const comprimento = (d.valor / total) * circunferencia;
    const arco = { comprimento, inicio: acumulado, cor: PALETA[i % PALETA.length] };
    acumulado += comprimento;
    return arco;
  });

  return (
    <View style={estilos.rosca}>
      <Svg width={tamanho} height={tamanho}>
        {arcos.map((arco, i) => (
          <Circle
            key={i}
            cx={tamanho / 2}
            cy={tamanho / 2}
            r={raio}
            fill="none"
            stroke={arco.cor}
            strokeWidth={traco}
            strokeDasharray={`${arco.comprimento} ${circunferencia - arco.comprimento}`}
            // Começa no topo (12h) sem rotação: a rotação gera CSS inválido na web.
            strokeDashoffset={circunferencia / 4 - arco.inicio}
          />
        ))}
        <SvgTexto
          x={tamanho / 2}
          y={tamanho / 2 + 5}
          fontSize={13}
          fontWeight="bold"
          fill={cores.texto}
          textAnchor="middle"
        >
          {moeda(total)}
        </SvgTexto>
      </Svg>

      <View style={estilos.legenda}>
        {dados.map((d, i) => (
          <View key={d.nome} style={estilos.itemLegenda}>
            <View style={[estilos.bolinha, { backgroundColor: PALETA[i % PALETA.length] }]} />
            <Text style={{ color: cores.texto, flex: 1 }} numberOfLines={1}>
              {d.nome}
            </Text>
            <Text style={{ color: cores.suave }}>
              {moeda(d.valor)} · {Math.round((d.valor / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// --- Barras: receitas x despesas por mês -----------------------------------

export function GraficoBarras({
  labels,
  receitas,
  despesas,
}: {
  labels: string[];
  receitas: number[];
  despesas: number[];
}) {
  const { cores } = useTema();
  const [largura, setLargura] = useState(0);

  const altura = 190;
  const margem = { esq: 8, dir: 8, topo: 12, base: 26 };
  const alturaUtil = altura - margem.topo - margem.base;
  const maximo = Math.max(1, ...receitas, ...despesas);

  const grupo = labels.length > 0 ? (largura - margem.esq - margem.dir) / labels.length : 0;
  const barra = Math.max(4, Math.min(18, grupo / 3));

  const alturaBarra = (valor: number) => (valor / maximo) * alturaUtil;

  return (
    <View>
      <View onLayout={(e) => setLargura(e.nativeEvent.layout.width)}>
        {largura > 0 ? (
          <Svg width={largura} height={altura}>
            <Line
              x1={margem.esq}
              x2={largura - margem.dir}
              y1={margem.topo + alturaUtil}
              y2={margem.topo + alturaUtil}
              stroke={cores.borda}
              strokeWidth={1}
            />
            {labels.map((label, i) => {
              const centro = margem.esq + grupo * (i + 0.5);
              const hr = alturaBarra(receitas[i] ?? 0);
              const hd = alturaBarra(despesas[i] ?? 0);
              return (
                <G key={label + i}>
                  <Rect
                    x={centro - barra - 1}
                    y={margem.topo + alturaUtil - hr}
                    width={barra}
                    height={hr}
                    rx={3}
                    fill={COR_TIPO.RECEITA}
                  />
                  <Rect
                    x={centro + 1}
                    y={margem.topo + alturaUtil - hd}
                    width={barra}
                    height={hd}
                    rx={3}
                    fill={COR_TIPO.DESPESA}
                  />
                  <SvgTexto
                    x={centro}
                    y={altura - 6}
                    fontSize={11}
                    fill={cores.suave}
                    textAnchor="middle"
                  >
                    {label}
                  </SvgTexto>
                </G>
              );
            })}
          </Svg>
        ) : null}
      </View>

      <View style={estilos.legendaBarras}>
        <View style={estilos.itemLegenda}>
          <View style={[estilos.bolinha, { backgroundColor: COR_TIPO.RECEITA }]} />
          <Text style={{ color: cores.suave, fontSize: 12 }}>Receitas</Text>
        </View>
        <View style={estilos.itemLegenda}>
          <View style={[estilos.bolinha, { backgroundColor: COR_TIPO.DESPESA }]} />
          <Text style={{ color: cores.suave, fontSize: 12 }}>Despesas</Text>
        </View>
      </View>
    </View>
  );
}

// --- Barra de progresso ----------------------------------------------------

export function BarraProgresso({ porcentagem, cor }: { porcentagem: number; cor?: string }) {
  const { cores } = useTema();
  const largura = Math.max(0, Math.min(100, porcentagem));
  return (
    <View style={[estilos.trilho, { backgroundColor: cores.borda }]}>
      <View
        style={[estilos.preenchimento, { width: `${largura}%`, backgroundColor: cor ?? cores.primaria }]}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  rosca: { alignItems: 'center', gap: 16 },
  legenda: { alignSelf: 'stretch', gap: 8 },
  itemLegenda: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bolinha: { width: 12, height: 12, borderRadius: 6 },
  legendaBarras: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 4 },
  trilho: { height: 10, borderRadius: 5, overflow: 'hidden' },
  preenchimento: { height: '100%', borderRadius: 5 },
});
