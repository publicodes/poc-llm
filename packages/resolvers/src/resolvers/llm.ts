/* eslint-disable arrow-body-style */

import { OpenAI } from "openai";

import { printNode, zodToTs } from "zod-to-ts";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ZodSchema, z } from "zod";

import { log } from "../utils";
import { ResolverParams, ResolverResult } from ".";

const defaultQuestionCallback = (question: string) => {
  return Promise.resolve(`question : ${question}`);
};

const defaultCommentCallback = (text: string) => {
  return console.log(`comment : ${text}`);
};

const getInstructions = ({ schema }: { schema: ZodSchema }) =>
  `
Tu es un assistant qui va aider l'utilisateur à répondre à une question.
Poses directement la question fournie initialement.
Utilises un language direct et vouvoies l'utilisateur.
Indique les choix possibles quand ils sont fournis dans le json-schema SCHEMA.
Tu ne dois jamais répondre à la place de l'utilisateur.
Ne fait appel à du cache ou à des informations générales.

Dès que l'utilisateur t'as donné la réponse, tu dois la renvoyer respectant le modèle XML suivant :

<EXPLICATIONS>[explications et détails de calcul]</EXPLICATIONS>
<REPONSE>[reponse respectant le schema TypeScript ci-dessous]</REPONSE>

SCHEMA: ${JSON.stringify(zodToJsonSchema(schema, "schema").definitions.schema)}

`.trim();

/**
 *
 * Help user resolve some question
 *
 */
export const resolveLLM = async ({
  question,
  schema,
  model = "gpt-3.5-turbo",
  questionCallback = defaultQuestionCallback,
  commentCallback = defaultCommentCallback,
}: ResolverParams): Promise<ResolverResult<typeof schema>> => {
  const openai = new OpenAI({
    timeout: 20 * 1000, // 20 seconds (default is 10 minutes)
    maxRetries: 10,
    apiKey: process.env.OPENAI_API_KEY || document.location.hash.slice(1),
    dangerouslyAllowBrowser: true,
  });
  let userAnswer: string;
  let result: ResolverResult<typeof schema> = {};
  const resultSchema = z.object({
    result: schema,
  });
  const instructions = getInstructions({ schema: resultSchema });
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: instructions },
    {
      role: "user",
      content: `Aidez-moi à répondre à la question "${question}" en commencant par me poser directement cette question.\n\nExplique toujours les choix possibles quand ils sont définis et ne répond jamais à la place de l'utilisateur.`,
    },
  ];
  //

  const fixAnswer = (str: string) => {
    if (str.match(/^[\d,.]+$/)) {
      return parseFloat(str);
    }
    return str;
  };

  userAnswer = await questionCallback(question);
  try {
    // todo: short-circuit LLM when answer match directly
    // @ts-ignore
    const coercedAnswer = fixAnswer(userAnswer);

    console.log("coercedAnswer", coercedAnswer);
    const validResponse = resultSchema.parse({
      result: coercedAnswer,
    });

    return Promise.resolve({
      answer: validResponse.result,
    });
  } catch (e) {
    console.log(e);
    //pass
  }

  messages.push({
    role: "assistant",
    content: question,
  });
  messages.push({
    role: "user",
    content: userAnswer,
  });

  //
  while (!result.answer) {
    log(
      "LLMResolver: messages",
      messages.map((m) => `${m.role}: ${m.content}`).join("\n")
    );

    // eslint-disable-next-line no-await-in-loop
    const llmResponse = await openai.chat.completions.create({
      messages,
      model,
    });

    log("LLMResolver: response", JSON.stringify(llmResponse, null, 2));

    const responseContent =
      llmResponse.choices.length &&
      llmResponse.choices[0] &&
      llmResponse.choices[0].message.content;

    log("LLMResolver: responseContent", responseContent);

    if (responseContent === "") {
      // WTH
      break;
    }
    if (typeof responseContent === "string") {
      if (responseContent.includes("<REPONSE>")) {
        try {
          const details = responseContent.substring(
            responseContent.indexOf("<EXPLICATIONS>") + 14,
            responseContent.indexOf("</EXPLICATIONS>")
          );
          const data = responseContent.substring(
            responseContent.indexOf("<REPONSE>") + 9,
            responseContent.indexOf("</REPONSE>")
          );
          try {
            const response = JSON.parse(data);
            if (typeof response.result !== "undefined") {
              const validResponse = resultSchema.parse({
                result: response.result,
              }) as typeof schema;

              result = {
                details,
                answer: validResponse.result,
              };
            } else {
              //todo

              console.log("todo llm#152");
            }
          } catch {
            const validResponse = resultSchema.parse({
              result: data,
            }) as typeof schema;
            result = {
              details,
              answer: validResponse.result,
            };
          }
        } catch (e) {
          console.log(e);
          // todo: handle invalid schemas
        }
      } else {
        messages.push({
          role: "assistant",
          content: responseContent,
        });
        // eslint-disable-next-line no-await-in-loop
        userAnswer = await questionCallback(responseContent);
        try {
          // short-circuit LLM when answer match directly
          // @ts-ignore
          const coercedAnswer = isNaN(userAnswer)
            ? userAnswer
            : parseFloat(userAnswer);
          // console.log("coercedAnswer", coercedAnswer);
          const validResponse = resultSchema.parse({
            result: coercedAnswer,
          });
          result = {
            answer: validResponse.result,
          };
        } catch (e) {
          console.log(e);
          //pass
        }
        messages.push({
          role: "user",
          content: userAnswer,
        });
      }
    }
  }
  if (result.details) {
    commentCallback(result.details);
  }
  return Promise.resolve(result);
};

// const questions = {
//   statut: {
//     question: "Quel est votre statut ?",
//     schema: z.object({
//       result: z
//         .enum(["Cadre", "Employé", "Agent de maitrise"])
//         .describe("Statut du salarié dans l'entreprise"),
//     }),
//   },
//   ancienneté: {
//     question: "Quel est votre ancienneté ?",
//     schema: z.object({
//       result: z.number().int().describe("Ancienneté dans l'entreprise en mois"),
//     }),
//   },
// };

// const rl = readlinePromises.createInterface({
//   input: process.stdin,
//   output: process.stdout,
// });

// LLMResolver({
//   ...questions.statut,
//   questionCallback: (question) => {
//     return askUser(rl, question);
//   },
// })
//   .then((d) => {
//     console.log("FINISHED");
//     console.log(d.details);
//     console.log(d.answer);
//   })
//   .catch(console.log)
//   .finally(() => {
//     rl.close();
//   });

export default resolveLLM;
