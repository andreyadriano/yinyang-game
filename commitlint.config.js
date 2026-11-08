// Conventional Commits: "<tipo>(escopo opcional): descrição".
// Tipos aceitos: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
// Além disso, mensagens com a linha "Co-Authored-By:" são rejeitadas: os commits têm um único autor.
export default {
  extends: ["@commitlint/config-conventional"],
  plugins: [
    {
      rules: {
        "no-co-author": ({ raw }) => [
          !/^co-authored-by:/im.test(raw ?? ""),
          'remova a linha "Co-Authored-By:" da mensagem do commit',
        ],
      },
    },
  ],
  rules: {
    "no-co-author": [2, "always"],
  },
};
