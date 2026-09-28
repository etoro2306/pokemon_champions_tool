/**
 * Parser seguro de literales de objeto JavaScript/TypeScript.
 *
 * Los ficheros de datos de Pokémon Showdown (pokedex.ts, formats-data.ts, learnsets.ts…)
 * son literales de objeto con claves sin comillas, claves numéricas, comas finales y
 * comentarios. JSON/JSON5 no los aceptan y evaluarlos con `eval` ejecutaría código remoto,
 * así que este parser los interpreta sin ejecutar nada. Si encuentra algo que no sea un
 * literal (una función, una expresión…) lanza un error en vez de ejecutarlo.
 */

type Value = string | number | boolean | null | undefined | Value[] | { [key: string]: Value };

class Parser {
  private i = 0;
  constructor(private readonly src: string) {}

  fail(msg: string): never {
    const line = this.src.slice(0, this.i).split('\n').length;
    throw new SyntaxError(`${msg} (línea ${line})`);
  }

  skip() {
    const s = this.src;
    for (;;) {
      const c = s[this.i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
        this.i++;
      } else if (c === '/' && s[this.i + 1] === '/') {
        while (this.i < s.length && s[this.i] !== '\n') this.i++;
      } else if (c === '/' && s[this.i + 1] === '*') {
        const end = s.indexOf('*/', this.i + 2);
        if (end < 0) this.fail('Comentario sin cerrar');
        this.i = end + 2;
      } else {
        return;
      }
    }
  }

  value(): Value {
    this.skip();
    const c = this.src[this.i];
    if (c === '{') return this.object();
    if (c === '[') return this.array();
    if (c === '"' || c === "'" || c === '`') return this.string();
    if (c === '-' || c === '+' || c === '.' || (c >= '0' && c <= '9')) return this.number();
    const word = this.identifier();
    switch (word) {
      case 'true': return true;
      case 'false': return false;
      case 'null': return null;
      case 'undefined': return undefined;
      case 'Infinity': return Infinity;
      default: this.fail(`Valor no literal "${word}"`);
    }
  }

  identifier(): string {
    const m = /^[A-Za-z_$][\w$]*/.exec(this.src.slice(this.i, this.i + 64));
    if (!m) this.fail(`Carácter inesperado "${this.src[this.i]}"`);
    this.i += m[0].length;
    return m[0];
  }

  number(): number {
    const m = /^[+-]?(0x[0-9a-f]+|\d*\.?\d+(e[+-]?\d+)?)/i.exec(this.src.slice(this.i, this.i + 40));
    if (!m) this.fail('Número inválido');
    this.i += m[0].length;
    return Number(m[0]);
  }

  string(): string {
    const s = this.src;
    const quote = s[this.i++];
    let out = '';
    while (this.i < s.length) {
      const c = s[this.i++];
      if (c === quote) return out;
      if (quote === '`' && c === '$' && s[this.i] === '{') this.fail('Plantilla con expresión');
      if (c === '\\') {
        const e = s[this.i++];
        if (e === 'n') out += '\n';
        else if (e === 't') out += '\t';
        else if (e === 'r') out += '\r';
        else if (e === 'u') {
          out += String.fromCharCode(parseInt(s.slice(this.i, this.i + 4), 16));
          this.i += 4;
        } else if (e === '\n') {
          /* continuación de línea */
        } else out += e;
      } else {
        out += c;
      }
    }
    this.fail('Cadena sin cerrar');
  }

  key(): string {
    this.skip();
    const c = this.src[this.i];
    if (c === '"' || c === "'") return this.string();
    if (c >= '0' && c <= '9') return String(this.number());
    return this.identifier();
  }

  object(): { [key: string]: Value } {
    this.i++; // {
    const out: { [key: string]: Value } = {};
    for (;;) {
      this.skip();
      if (this.src[this.i] === '}') { this.i++; return out; }
      const k = this.key();
      this.skip();
      if (this.src[this.i] !== ':') this.fail(`Se esperaba ":" tras "${k}"`);
      this.i++;
      out[k] = this.value();
      this.skip();
      if (this.src[this.i] === ',') this.i++;
      else if (this.src[this.i] !== '}') this.fail('Se esperaba "," o "}"');
    }
  }

  array(): Value[] {
    this.i++; // [
    const out: Value[] = [];
    for (;;) {
      this.skip();
      if (this.src[this.i] === ']') { this.i++; return out; }
      out.push(this.value());
      this.skip();
      if (this.src[this.i] === ',') this.i++;
      else if (this.src[this.i] !== ']') this.fail('Se esperaba "," o "]"');
    }
  }
}

/** Parsea un literal (objeto, array, número…) a partir de su texto fuente. */
export function parseLiteral<T = unknown>(src: string): T {
  const p = new Parser(src);
  return p.value() as T;
}

/**
 * Extrae y parsea el objeto exportado de un fichero de datos de Showdown, p. ej.
 * `export const Pokedex: import('...').SpeciesDataTable = { ... };`
 */
export function parseShowdownDataFile<T = Record<string, any>>(source: string, exportName?: string): T {
  const re = exportName
    ? new RegExp(`export const ${exportName}\\b[^=]*=\\s*`)
    : /export const \w+\b[^=]*=\s*/;
  const m = re.exec(source);
  if (!m) throw new SyntaxError(`No se encontró la exportación ${exportName ?? ''}`.trim());
  const start = m.index + m[0].length;
  const p = new Parser(source.slice(start));
  return p.value() as T;
}
