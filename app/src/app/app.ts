import { Component, computed, signal } from '@angular/core';
import {
  Apresentacao, CAP_PERCENTUAL, CmedRaw, Contexto, TipoCompra, UFS,
  calcularTeto, carregarDados, moeda, normalizar, rotuloAliquota,
} from './cmed';

declare global {
  interface Window { CMED_DATA?: CmedRaw }
}

const LIMITE = 60;
const EXEMPLO = 'levosimendana';

function lerPreferencia(chave: string): string | null {
  try { return localStorage.getItem('precomed.' + chave); } catch { return null; }
}
function salvarPreferencia(chave: string, valor: string) {
  try { localStorage.setItem('precomed.' + chave, valor); } catch { /* sem armazenamento */ }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly raw = window.CMED_DATA;
  protected readonly itens: Apresentacao[] = this.raw ? carregarDados(this.raw) : [];
  protected readonly aliquotas = this.raw?.aliquotas ?? [];
  protected readonly aliquotasIcms = this.aliquotas.filter((a) => a !== 'SI' && a !== '0');
  protected readonly ufs = UFS;
  protected readonly capPercentual = CAP_PERCENTUAL.toString().replace('.', ',');
  protected readonly moeda = moeda;
  protected readonly rotuloAliquota = rotuloAliquota;

  protected readonly uf = signal(UFS.find((u) => u.sigla === (lerPreferencia('uf') ?? 'PE')) ?? UFS[16]);
  protected readonly aliquotaManual = signal<string | null>(null);
  protected readonly tipoCompra = signal<TipoCompra>('regular');
  protected readonly compradorPublico = signal(lerPreferencia('publico') !== '0');
  protected readonly termo = signal(EXEMPLO);
  protected readonly soComercializados = signal(false);
  protected readonly selecionadoId = signal<number | null>(null);
  protected readonly quantidade = signal(1);

  protected readonly contexto = computed<Contexto>(() => ({
    uf: this.uf(),
    aliquotaManual: this.aliquotaManual(),
    tipoCompra: this.tipoCompra(),
    compradorPublico: this.compradorPublico(),
  }));

  protected readonly encontrados = computed(() => {
    const tokens = normalizar(this.termo()).split(/\s+/).filter((t) => t.length > 0);
    if (!tokens.length) return [];
    const soCom = this.soComercializados();
    const lista = this.itens.filter(
      (i) => (!soCom || i.comercializado) && tokens.every((t) => i.busca.includes(t)),
    );
    const primeiro = tokens[0];
    const peso = (i: Apresentacao) =>
      normalizar(i.produto).startsWith(primeiro) || normalizar(i.substancia).startsWith(primeiro) ? 0 : 1;
    return lista.sort(
      (a, b) => peso(a) - peso(b) || a.produto.localeCompare(b.produto) || a.apresentacao.localeCompare(b.apresentacao),
    );
  });

  protected readonly resultados = computed(() => {
    const ctx = this.contexto();
    return this.encontrados().slice(0, LIMITE).map((item) => ({ item, teto: calcularTeto(item, ctx, this.aliquotas) }));
  });

  protected readonly selecionado = computed(() => {
    const id = this.selecionadoId() ?? this.resultados()[0]?.item.id;
    const item = id == null ? undefined : this.itens[id];
    return item ? { item, teto: calcularTeto(item, this.contexto(), this.aliquotas) } : null;
  });

  protected readonly limite = LIMITE;

  protected escolherUf(sigla: string) {
    const uf = UFS.find((u) => u.sigla === sigla);
    if (!uf) return;
    this.uf.set(uf);
    this.aliquotaManual.set(null);
    salvarPreferencia('uf', sigla);
  }

  protected escolherAliquota(valor: string) {
    this.aliquotaManual.set(valor === 'auto' ? null : valor);
  }

  protected escolherPublico(v: boolean) {
    this.compradorPublico.set(v);
    salvarPreferencia('publico', v ? '1' : '0');
  }

  protected buscar(v: string) {
    this.termo.set(v);
    this.selecionadoId.set(null);
  }

  protected selecionar(id: number) {
    this.selecionadoId.set(id);
    // Em telas estreitas o detalhe fica abaixo da lista.
    if (window.matchMedia('(max-width: 899px)').matches) {
      document.getElementById('detalhe')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  protected definirQuantidade(v: string) {
    const n = Math.max(0, Math.floor(Number(v.replace(/\./g, '').replace(',', '.')) || 0));
    this.quantidade.set(n);
  }

  protected total(valor: number | null): number | null {
    return valor == null ? null : valor * this.quantidade();
  }

  protected ehColunaTeto(ref: 'PF' | 'PMVG', aliquota: string): boolean {
    const t = this.selecionado()?.teto;
    return !!t && t.referencia === ref && t.aliquota === aliquota;
  }
}
