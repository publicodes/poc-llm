import { ReactNode } from "react";
import { formatValue } from "publicodes";

import rulesPreavisRetraite from "./preavis-retraite.json";
import rulesImc from "./imc.json";
import rulesCovid from "./covid.json";
import rulesOvh from "./ovh.json";

type PublicodeRules = Record<string, any>;

export type PublicodeModelDefinition = {
  rules: PublicodeRules;
  key: string;
  title: string;
  warning: ReactNode;
  getConclusion: (arg0: any) => string;
};

export const models = {
  "preavis-retraite": {
    rules: rulesPreavisRetraite,
    key: "contrat salarié . préavis de retraite",
    title: "Calcul du préavis de départ à la retraite",
    getConclusion: ({ situation, resolved }) => {
      const parametersList = Object.entries(situation).map(([key, value]) => {
        const label = rulesPreavisRetraite[key]?.titre;
        return ` - ${label} : ${value}`;
      });
      console.log(resolved);
      return `
D'après les paramètres suivants, le préavis de retraite est de **${formatValue(
        resolved
      )}**.

### Paramètres utilisés:

${parametersList.join("\n")}

Vous pouvez vous rendre sur [le site du code du travail numérique](https://code.travail.gouv.fr) pour en savoir plus.`.trim();
    },
    warning: (
      <>
        <br /> Merci de vous réferrer au{" "}
        <a href="https://code.travail.gouv.fr/outils/preavis-retraite">
          site du Code du travail numérique
        </a>
        .
      </>
    ),
  } as PublicodeModelDefinition,

  // ovh: {
  //   rules: rulesOvh,
  //   key: "markdown",
  //   title: "Calcul OVH",
  //   warning: null,
  //   getConclusion: ({ situation, resolved }) => {
  //     console.log(resolved.nodeValue);

  //     return resolved.nodeValue;
  //   },
  // } as PublicodeModelDefinition,
  covid: {
    rules: rulesCovid,
    key: "résultat",
    title: "Algorithme d'orientation COVID",
    warning: (
      <>
        <br /> Implémentation expérimentale de{" "}
        <a href="https://delegation-numerique-en-sante.github.io/covid19-algorithme-orientation/">
          l'Algorithme d'orientation COVID-19
        </a>
        .
      </>
    ),
    getConclusion: ({ situation, resolved }) => {
      console.log(resolved.nodeValue);

      return resolved.nodeValue;
    },
  } as PublicodeModelDefinition,
  imc: {
    rules: rulesImc,
    key: "résultat",
    title: "Calcul de l'IMC",
    warning: null,
    getConclusion: ({ situation, resolved }) => {
      console.log(resolved.nodeValue);

      return resolved.nodeValue;
    },
  } as PublicodeModelDefinition,
};
