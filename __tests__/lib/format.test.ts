import {
  dataBR,
  isoParaData,
  lerDataBR,
  lerValor,
  mascararMoeda,
  mascararTelefone,
  moeda,
  normalizar,
  numeroParaCampo,
  paraISO,
} from '@/lib/format';

describe('moeda', () => {
  it.each([
    [0, 'R$ 0,00'],
    [1234.5, 'R$ 1.234,50'],
    [1000000, 'R$ 1.000.000,00'],
    [-10, '-R$ 10,00'],
    [0.1 + 0.2, 'R$ 0,30'],
    [999.999, 'R$ 1.000,00'],
  ])('formata %p como %p', (valor, esperado) => {
    expect(moeda(valor)).toBe(esperado);
  });
});

describe('lerValor', () => {
  it.each([
    ['1.234,56', 1234.56],
    ['12,5', 12.5],
    ['12.50', 12.5],
    ['R$ 99,90', 99.9],
    ['0,01', 0.01],
  ])('lê %p como %p', (texto, esperado) => {
    expect(lerValor(texto)).toBeCloseTo(esperado, 10);
  });

  it.each(['', 'abc', 'R$', '   '])('devolve null para %p', (texto) => {
    expect(lerValor(texto)).toBeNull();
  });

  it('é o inverso da máscara de moeda', () => {
    for (const digitos of ['1', '99', '12345', '9999999999']) {
      const mascarado = mascararMoeda(digitos);
      expect(lerValor(mascarado)).toBeCloseTo(Number(digitos) / 100, 10);
    }
  });
});

describe('mascararMoeda', () => {
  it.each([
    ['1', '0,01'],
    ['12', '0,12'],
    ['123', '1,23'],
    ['12345', '123,45'],
    ['123456789', '1.234.567,89'],
    ['0005', '0,05'],
    ['R$ 1.2a3', '1,23'],
  ])('mascara %p como %p', (texto, esperado) => {
    expect(mascararMoeda(texto)).toBe(esperado);
  });

  it('devolve vazio sem dígitos significativos', () => {
    expect(mascararMoeda('')).toBe('');
    expect(mascararMoeda('000')).toBe('');
    expect(mascararMoeda('abc')).toBe('');
  });

  it('limita a 10 dígitos (até 99.999.999,99, o máximo do banco)', () => {
    expect(mascararMoeda('123456789012')).toBe('12.345.678,90');
    expect(mascararMoeda('9999999999')).toBe('99.999.999,99');
  });

  it('simula a digitação dígito a dígito', () => {
    let campo = '';
    const vistos: string[] = [];
    for (const tecla of '150075') {
      campo = mascararMoeda(campo + tecla);
      vistos.push(campo);
    }
    expect(vistos).toEqual(['0,01', '0,15', '1,50', '15,00', '150,07', '1.500,75']);
  });

  it('apagar o último dígito volta ao valor anterior', () => {
    expect(mascararMoeda('1.500,7')).toBe('150,07');
  });
});

describe('numeroParaCampo', () => {
  it('converte valores do banco para o campo mascarado', () => {
    expect(numeroParaCampo(1234.5)).toBe('1.234,50');
    expect(numeroParaCampo(0.1 + 0.2)).toBe('0,30');
    expect(numeroParaCampo(19.99)).toBe('19,99');
  });

  it('zero vira campo vazio', () => {
    expect(numeroParaCampo(0)).toBe('');
  });
});

describe('datas', () => {
  it('paraISO usa o fuso local e completa com zeros', () => {
    expect(paraISO(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(paraISO(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });

  it('dataBR inverte a data', () => {
    expect(dataBR('2026-11-03')).toBe('03/11/2026');
  });

  it('isoParaData não sofre deslocamento de fuso', () => {
    const data = isoParaData('2026-03-01');
    expect(data.getFullYear()).toBe(2026);
    expect(data.getMonth()).toBe(2);
    expect(data.getDate()).toBe(1);
  });

  it.each([
    ['03/11/2026', '2026-11-03'],
    ['1/2/2026', '2026-02-01'],
    ['29/02/2024', '2024-02-29'],
  ])('lerDataBR aceita %p', (texto, esperado) => {
    expect(lerDataBR(texto)).toBe(esperado);
  });

  it.each(['31/02/2026', '29/02/2026', '01/13/2026', '00/01/2026', '2026-02-01', '', '10/10', '10/10/1800'])(
    'lerDataBR recusa %p',
    (texto) => {
      expect(lerDataBR(texto)).toBeNull();
    },
  );

  it('ida e volta entre ISO e BR é estável', () => {
    for (const iso of ['2024-02-29', '2026-01-01', '2026-12-31']) {
      expect(lerDataBR(dataBR(iso))).toBe(iso);
    }
  });
});

describe('mascararTelefone', () => {
  it.each([
    ['', ''],
    ['1', '(1'],
    ['11', '(11'],
    ['119', '(11) 9'],
    ['119876', '(11) 9876'],
    ['1198765', '(11) 9876-5'],
    ['1134567890', '(11) 3456-7890'],
    ['11987654321', '(11) 98765-4321'],
    ['(11) 98765-43210', '(11) 98765-4321'],
  ])('mascara %p como %p', (texto, esperado) => {
    expect(mascararTelefone(texto)).toBe(esperado);
  });

  it('reaplicar a máscara não altera o resultado', () => {
    const uma = mascararTelefone('11987654321');
    expect(mascararTelefone(uma)).toBe(uma);
  });
});

describe('normalizar', () => {
  it('remove acentos e deixa minúsculo', () => {
    expect(normalizar('Ação Çedilha ÉÊ')).toBe('acao cedilha ee');
    expect(normalizar('SALÁRIO')).toBe('salario');
  });
});
