// Dados da lista CMED de conformidade para compras públicas (gerados por scripts/converter_cmed.py)
// e as regras usadas para escolher o teto de preço de cada compra.

export interface CmedRaw {
  publicada: string;
  arquivo: string;
  aliquotas: string[]; // 'SI' (sem impostos), '0', '12', ... '23'
  anoComercializacao: string;
  tabelas: { s: string[]; l: string[]; c: string[]; t: string[]; tj: string[] };
  itens: RawItem[];
}

type RawItem = [
  number, number, string, string, string, string, string, string,
  number, number, string, number, string, string, number,
  (number | null)[], (number | null)[],
];

export interface Apresentacao {
  id: number;
  substancia: string;
  laboratorio: string;
  cnpj: string;
  ggrem: string;
  registro: string;
  ean: string;
  produto: string;
  apresentacao: string;
  classe: string;
  tipo: string;
  regime: 'Regulado' | 'Liberado';
  hospitalar: boolean;
  cap: boolean;
  confaz87: boolean;
  icms0: boolean;
  comercializado: boolean;
  analiseRecursal: string;
  listaPisCofins: string;
  tarja: string;
  pf: (number | null)[]; // centavos, na ordem de CmedRaw.aliquotas
  pmvg: (number | null)[];
  busca: string;
}

export const CAP_PERCENTUAL = 21.53;

export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function carregarDados(raw: CmedRaw): Apresentacao[] {
  const t = raw.tabelas;
  return raw.itens.map((r, id) => {
    const [s, l, cnpj, ggrem, registro, ean, produto, apresentacao, c, tipo, rg, f, ar, pc, tj, pf, pmvg] = r;
    const substancia = t.s[s];
    const laboratorio = t.l[l];
    return {
      id, substancia, laboratorio, cnpj, ggrem, registro, ean, produto, apresentacao,
      classe: t.c[c], tipo: t.t[tipo] || '—',
      regime: rg === 'L' ? 'Liberado' : 'Regulado',
      hospitalar: !!(f & 1), cap: !!(f & 2), confaz87: !!(f & 4), icms0: !!(f & 8), comercializado: !!(f & 16),
      analiseRecursal: ar, listaPisCofins: pc, tarja: t.tj[tj],
      pf, pmvg,
      busca: normalizar([produto, substancia, laboratorio, apresentacao, ean, registro, ggrem].join(' ')),
    };
  });
}

// Alíquota de ICMS aplicada a medicamentos em cada UF (operação interna / destino).
// Referência: tabelas estaduais 2025/2026. Confira sempre na SEFAZ do estado; o usuário pode ajustar.
export interface Uf { sigla: string; nome: string; aliquota: string; genericos?: string; nota?: string }

export const UFS: Uf[] = [
  { sigla: 'AC', nome: 'Acre', aliquota: '19' },
  { sigla: 'AL', nome: 'Alagoas', aliquota: '19' },
  { sigla: 'AP', nome: 'Amapá', aliquota: '18' },
  { sigla: 'AM', nome: 'Amazonas', aliquota: '20' },
  { sigla: 'BA', nome: 'Bahia', aliquota: '20,5' },
  { sigla: 'CE', nome: 'Ceará', aliquota: '20' },
  { sigla: 'DF', nome: 'Distrito Federal', aliquota: '17' },
  { sigla: 'ES', nome: 'Espírito Santo', aliquota: '17' },
  { sigla: 'GO', nome: 'Goiás', aliquota: '19' },
  { sigla: 'MA', nome: 'Maranhão', aliquota: '23' },
  { sigla: 'MT', nome: 'Mato Grosso', aliquota: '17' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul', aliquota: '17' },
  { sigla: 'MG', nome: 'Minas Gerais', aliquota: '18', genericos: '12' },
  { sigla: 'PA', nome: 'Pará', aliquota: '19' },
  { sigla: 'PB', nome: 'Paraíba', aliquota: '20' },
  { sigla: 'PR', nome: 'Paraná', aliquota: '19,5' },
  { sigla: 'PE', nome: 'Pernambuco', aliquota: '20,5', nota: 'Alíquota modal de 20,5% desde 2024.' },
  { sigla: 'PI', nome: 'Piauí', aliquota: '22,5' },
  { sigla: 'RJ', nome: 'Rio de Janeiro', aliquota: '22', nota: '20% + 2% de FCP.' },
  { sigla: 'RN', nome: 'Rio Grande do Norte', aliquota: '20' },
  { sigla: 'RS', nome: 'Rio Grande do Sul', aliquota: '17' },
  { sigla: 'RO', nome: 'Rondônia', aliquota: '19,5' },
  { sigla: 'RR', nome: 'Roraima', aliquota: '20' },
  { sigla: 'SC', nome: 'Santa Catarina', aliquota: '17' },
  { sigla: 'SP', nome: 'São Paulo', aliquota: '18', genericos: '12' },
  { sigla: 'SE', nome: 'Sergipe', aliquota: '19' },
  { sigla: 'TO', nome: 'Tocantins', aliquota: '20' },
];

export type TipoCompra = 'regular' | 'judicial';

export interface Contexto {
  uf: Uf;
  aliquotaManual: string | null; // null = usar a da UF
  tipoCompra: TipoCompra;
  compradorPublico: boolean;
}

export interface Teto {
  referencia: 'PF' | 'PMVG';
  aliquota: string;
  coluna: string; // nome da coluna na planilha CMED
  valor: number | null; // centavos
  motivos: string[];
}

export function rotuloAliquota(a: string): string {
  return a === 'SI' ? 'Sem impostos' : `${a}%`;
}

export function calcularTeto(item: Apresentacao, ctx: Contexto, aliquotas: string[]): Teto {
  const motivos: string[] = [];
  const pmvg = item.cap || ctx.tipoCompra === 'judicial';
  const referencia = pmvg ? 'PMVG' : 'PF';

  if (item.cap) {
    motivos.push(`O produto tem a marca CAP: nas vendas ao poder público vale o PMVG (PF com desconto mínimo de ${CAP_PERCENTUAL.toString().replace('.', ',')}%).`);
  } else if (ctx.tipoCompra === 'judicial') {
    motivos.push('Compra para cumprir ordem judicial: aplica-se o CAP, então o teto é o PMVG.');
  } else {
    motivos.push('Sem marca CAP e sem ordem judicial: o teto é o Preço Fábrica (PF).');
  }

  let aliquota: string;
  if (item.icms0) {
    aliquota = '0';
    motivos.push('Apresentação isenta de ICMS (coluna “ICMS 0%” = Sim): só vale o preço a 0%.');
  } else if (item.confaz87 && ctx.compradorPublico) {
    aliquota = '0';
    motivos.push('Consta no Convênio ICMS 87/02 e o comprador é órgão público: a proposta deve vir com o ICMS desonerado (Acórdão TCU 140/2012), por isso o preço a 0%.');
  } else if (ctx.aliquotaManual) {
    aliquota = ctx.aliquotaManual;
    motivos.push(`Alíquota de ICMS escolhida manualmente: ${aliquota}%.`);
  } else if (ctx.uf.genericos && item.tipo === 'Genérico') {
    aliquota = ctx.uf.genericos;
    motivos.push(`Genérico com destino a ${ctx.uf.sigla}: alíquota reduzida de ${aliquota}%.`);
  } else {
    aliquota = ctx.uf.aliquota;
    motivos.push(`ICMS do estado de destino (${ctx.uf.sigla}): ${aliquota}%.`);
  }
  if (item.confaz87 && !ctx.compradorPublico && !item.icms0) {
    motivos.push('Consta no Convênio ICMS 87/02, mas a isenção só vale quando o comprador é órgão público.');
  }

  const i = aliquotas.indexOf(aliquota);
  const valor = (pmvg ? item.pmvg : item.pf)[i] ?? null;
  return { referencia, aliquota, coluna: `${referencia} ${aliquota} %`, valor, motivos };
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export function moeda(centavos: number | null | undefined): string {
  return centavos == null ? '—' : brl.format(centavos / 100);
}
