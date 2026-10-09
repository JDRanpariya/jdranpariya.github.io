// A real SQLite adapter for D1 tests and loopback-only previews.
export function sqliteD1(database) {
  return {
    prepare(sql) {
      return {
        bind(...values) {
          const statement = database.prepare(sql);
          return {
            async first() {
              return statement.get(...values) || null;
            },
            async all() {
              return { results: statement.all(...values) };
            },
            async run() {
              const result = statement.run(...values);
              return {
                meta: {
                  changes: Number(result.changes),
                  last_row_id: Number(result.lastInsertRowid),
                },
              };
            },
          };
        },
      };
    },
  };
}
