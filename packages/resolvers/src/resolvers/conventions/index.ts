/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-await-in-loop */
import OpenAI from "openai";
import { RunnableToolFunctionWithParse } from "openai/lib/RunnableFunction";
import { JSONSchema } from "openai/lib/jsonschema";
import { ChatCompletionMessageParam } from "openai/resources";
import { ZodSchema } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import { SimpleRuleResolver } from "..";
import {
  RechercheConventionParameters,
  rechercheConventionParNom,
} from "./kali";
import {
  RechercheEntrepriseParameters,
  rechercheConventionParEntreprise,
} from "./entreprises";

import kaliData from "./kali-data.json";

const getKaliNameFromIdcc = (idcc: string) => {
  return kaliData.find((convention) => {
    return convention.idcc === parseInt(idcc);
  })?.title;
};

const client = new OpenAI({
  timeout: 15000,
  maxRetries: 10,
  apiKey: process.env.OPENAI_API_KEY || document.location.hash.slice(1),
  dangerouslyAllowBrowser: true,
});

function zodParseJSON<T>(schema: ZodSchema<T>) {
  return (input: string): T => {
    return schema.parse(JSON.parse(input));
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tools: RunnableToolFunctionWithParse<any>[] = [
  {
    type: "function",
    function: {
      function: rechercheConventionParEntreprise,
      description: "Pour rechercher par entreprise et par ville",
      parse: zodParseJSON(RechercheEntrepriseParameters),
      parameters: zodToJsonSchema(RechercheEntrepriseParameters) as JSONSchema,
    },
  },
  {
    type: "function",
    function: {
      function: rechercheConventionParNom,
      description: "Pour rechercher par nom de convention collective ou métier",
      parse: zodParseJSON(RechercheConventionParameters),
      parameters: zodToJsonSchema(RechercheConventionParameters) as JSONSchema,
    },
  },
];

const PROMPT_SYSTEM = `Tu permets à l'utilisateur d'identifier le numéro IDCC de sa convention collective. Utilises un language direct et vouvoies l'utilisateur. Commences toujours par demander s'il connait le nom ou numéro de sa convention collective ou s'il peut te donner le nom et la ville de son entreprise. ne dis pas bonjour.

Quand l'utilisateur précise son entreprise, il doit toujours préciser la ville.
Si un outil renvoie plusieurs IDCC différents, demande à l'utilisateur de choisir le bon IDCC parmi la liste des conventions proposées et n'appelle plus de fonction.
Ne définit jamais les paramètres à la place de l'utilisateur.
Ne fait appel à du cache ou à des informations générales.

Une fois l'IDCC de la convention déterminé, envoie le résultat en suivant le modele XML ci dessous et rien de plus:
<IDCC>[numero idcc de la convention collective]</IDCC>
`;

export const resolveConventionCollective: SimpleRuleResolver = async ({
  questionCallback,
  commentCallback,
}) =>
  //tools: RunnableToolFunctionWithParse<any>[]
  {
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: PROMPT_SYSTEM },
    ];
    let result;

    while (!result) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const runner = client.beta.chat.completions.runTools({
        model: "gpt-3.5-turbo-1106",
        messages,
        tools,
        temperature: 0.1,
      });

      const finalContent = await runner.finalContent();

      if (finalContent) {
        const idccMatches = finalContent.match(/<IDCC>([^<]+)<\/IDCC>/);
        if (idccMatches) {
          result = idccMatches[1] as string;
          commentCallback(
            `Convention collective sélectionnée : IDCC ${result} : ${getKaliNameFromIdcc(
              result
            )}`
          );
        } else {
          messages.push({ role: "assistant", content: finalContent });
          // eslint-disable-next-line no-await-in-loop
          const content = await questionCallback(finalContent);
          messages.push({ role: "user", content });
          if (content.match(/^(IDCC)?\s*\d\d\d+/)) {
            const idcc = content.replace(/IDCC/, "").trim();
            result = idcc as string;
          }
        }
      }
    }
    console.log("resolveConventionCollective", result);
    return Promise.resolve({ result: `IDCC${result}` });
  };
