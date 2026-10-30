// Minimal SQL transport for exercising the real handler against PostgreSQL, without a hosted stack.
// It does not fake RLS, constraints, RPCs, transactions or publish claims.
import type { PGlite } from '@electric-sql/pglite';
export function databaseClient(db: PGlite, auth: any, storage: any) {
  const ident = (s: string) => {
    if (!/^[a-z_]+$/.test(s)) throw new Error('Invalid test identifier');
    return `"${s}"`;
  };
  return {
    auth,
    storage,
    rpc: async (name: string, args: Record<string, unknown>) => {
      try {
        const v = Object.values(args);
        const q = await db.query<any>(
          `select public.${ident(name)}(${Object.keys(args).map((k, i) => ident(k) + ' => $' + (i + 1)).join(',')}) result`,
          v.map((x) => x && typeof x === 'object' ? JSON.stringify(x) : x),
        );
        return { data: q.rows[0].result, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    from(table: string) {
      let op = 'select', cols = '*', value: any, filters: string[] = [], params: any[] = [], max = '', single = false, returning = false;
      const param = (v: any) => {
        params.push(v);
        return '$' + params.length;
      };
      const chain: any = {
        select(c = '*') {
          cols = c;
          returning = true;
          return chain;
        },
        insert(v: any) {
          op = 'insert';
          value = v;
          return chain;
        },
        upsert(v: any) {
          op = 'upsert';
          value = v;
          return chain;
        },
        update(v: any) {
          op = 'update';
          value = v;
          return chain;
        },
        delete() {
          op = 'delete';
          return chain;
        },
        eq(k: string, v: any) {
          filters.push(`${ident(k)}=${param(v)}`);
          return chain;
        },
        in(k: string, v: any[]) {
          filters.push(`${ident(k)}=any(${param(v)})`);
          return chain;
        },
        lte(k: string, v: any) {
          filters.push(`${ident(k)}<=${param(v)}`);
          return chain;
        },
        limit(n: number) {
          max = ` limit ${Number(n)}`;
          return chain;
        },
        maybeSingle() {
          single = true;
          return chain;
        },
        then(resolve: any, reject: any) {
          const execute = async () => {
            try {
              const where = filters.length ? ' where ' + filters.join(' and ') : '';
              let sql = '';
              if (op === 'select') {
                sql = `select ${cols === '*' ? '*' : cols.split(',').map(ident).join(',')} from public.${ident(table)}${where}${max}`;
              }
              if (op === 'delete') sql = `delete from public.${ident(table)}${where}${returning ? ' returning *' : ''}`;
              if (op === 'update') {
                sql = `update public.${ident(table)} set ${
                  Object.entries(value).map(([k, v]) => `${ident(k)}=${param(typeof v === 'object' ? JSON.stringify(v) : v)}`).join(',')
                }${where}${returning ? ' returning *' : ''}`;
              }
              if (op === 'insert' || op === 'upsert') {
                const keys = Object.keys(value);
                sql = `insert into public.${ident(table)}(${keys.map(ident).join(',')}) values(${
                  keys.map((k) => param(typeof value[k] === 'object' ? JSON.stringify(value[k]) : value[k])).join(',')
                })${op === 'upsert' ? ' on conflict do nothing' : ''}${returning ? ' returning *' : ''}`;
              }
              const r = await db.query(sql, params);
              return { data: single ? r.rows[0] ?? null : r.rows, error: null };
            } catch (error) {
              return { data: null, error };
            }
          };
          return execute().then(resolve, reject);
        },
      };
      return chain;
    },
  };
}
