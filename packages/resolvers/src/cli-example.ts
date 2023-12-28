// input user intro, compute and ask missing questions
import readlinePromises from "node:readline/promises";
import { formatValue } from "publicodes";

import rules from "./publicodes/preavis-retraite/rules.json";
import { resolvePublicodes } from "./resolvers/publicodes";
import { askUser } from "./utils";

const rl = readlinePromises.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/*
// todo: resolvers
const yaml = `
models:
  préavis-de-retraite:
    title: Calculer le préavis de retraite d'un(e) salarié(e)
    key: "contrat salarié . préavis de retraite"
    messages:
      resultat: |
        D'après les paramètres suivants, le préavis de retraite est de **XXX**.
      conclusion: |
        Vous pouvez vous rendre sur [le site du code du travail numérique](https://code.travail.gouv.fr) pour en savoir plus.
`;

*/

resolvePublicodes({
  rules,
  key: "contrat salarié . préavis de retraite",
  questionCallback: (question) => {
    return askUser(rl, question);
  },
  commentCallback: (comment) => {
    console.log(comment);
  },
})
  .then(({ situation, resolved }) => {
    const parametersList = Object.entries(situation).map(([key, value]) => {
      const label = rules[key]?.titre;
      return ` - ${label} : ${value}`;
    });
    const conclusion = `

D'après les paramètres suivants, le préavis de retraite est de **${formatValue(
      resolved
    )}**.

### Paramètres utilisés:

${parametersList.join("\n")}

Vous pouvez vous rendre sur [le site du code du travail numérique](https://code.travail.gouv.fr) pour en savoir plus.`.trim();

    console.log("DONE");
    console.log(conclusion);
  })
  .catch(console.log)
  .finally(() => {
    return rl.close();
  });
