import Engine, { Rule, EvaluatedNode, PublicodesExpression } from "publicodes";
import { toPublicodeValue, log, runResolver } from "../utils";
import { ZodSchema, z } from "zod";
import { SimpleRuleResolver, ResolverParams } from ".";
import { resolveConventionCollective } from "./conventions";
import { resolveLLM } from "./llm";

type RawRule = Omit<Rule, "nom"> | string | number;

type CdtnRuleNode = RawRule & {
  cdtn?: {
    type?: string;
    valeurs?: Record<string, string | number>;
    [x: string]: unknown;
  };
  question?: string;
  titre?: string;
  [x: string]: unknown;
};

const getRuleSchema = (rule: CdtnRuleNode): ZodSchema => {
  const nodeType = rule.cdtn?.type || rule.meta?.type;
  const describe = `${rule.titre || rule.question}${
    rule.unité ? ` (en ${rule.unité})` : ``
  }`;
  console.log("nodeType", nodeType, describe);
  let fieldSchema: ZodSchema = z.string().describe(describe);
  if (nodeType === "oui-non") {
    fieldSchema = z.enum(["oui", "non"]).describe(describe);
  } else if (nodeType === "entier") {
    fieldSchema = z.number().int().describe(describe);
  } else if (nodeType === "liste") {
    // todo: use some convention instead of "cdtn"
    const root = (rule.cdtn && rule.cdtn.valeurs) || rule.meta?.valeurs;
    if (root && Object.values(root || []).length) {
      const values: { value: string; label: string }[] = Object.entries(
        root || []
      )
        .map(([k, v]) => {
          console.log("k,x", k, v.toString().replace(/'/g, ""));
          return {
            value: (v.toString().replace(/'/g, "") !== k.toString()
              ? `${v}`
              : `${k}`
            )
              .replace(/^'/, "")
              .replace(/'$/, ""),
            label: k,
          };
        })
        .filter(Boolean);
      if (values.length > 0) {
        fieldSchema = z
          //@ts-ignore
          .enum(values.map((v) => v.value))
          .describe(
            describe +
              ` choisir parmi: ${values
                .map((v) => `${v.label}: ${v.value}`)
                .join(", ")}`
          );
      }
    }
  }
  return fieldSchema;
};

const isStr = (obj: unknown): obj is string => {
  return Object.prototype.toString.call(obj) === "[object String]";
};

const getMissingVariable = (
  rules: Record<string, string | CdtnRuleNode>,
  result: EvaluatedNode
) => {
  const missings = Object.entries(result.missingVariables);
  if (missings.length && missings[0]) {
    // sort by priority
    missings.sort((a, b) => {
      return b[1] - a[1];
    });
    const missingKey = missings[0][0];
    const missingRule = rules[missingKey];
    if (!isStr(missingRule)) {
      const missingQuestion =
        missingRule && (missingRule.question || missingRule.titre);
      return {
        missingKey,
        missingRule,
        missingQuestion,
      };
    }
  }
  return {
    missingKey: null,
    missingRule: null,
    missingQuestion: null,
  };
};

const defaultResolvers: Record<string, SimpleRuleResolver> = {
  "contrat salarié . convention collective": resolveConventionCollective,
};

const defaultQuestionCallback = (question: string) => {
  return Promise.resolve(`question : ${question}`);
};

const defaultCommentCallback = (text: string) => {
  return console.log(`comment : ${text}`);
};

export const resolvePublicodes = async ({
  rules,
  key,
  resolvers = defaultResolvers,
  questionCallback = defaultQuestionCallback,
  commentCallback = defaultCommentCallback,
}: {
  // todo: generic type for the record keys
  rules: Record<string, string | CdtnRuleNode>;
  key: string;
  resolvers?: Record<string, SimpleRuleResolver>;
  questionCallback: ResolverParams["questionCallback"];
  commentCallback: ResolverParams["commentCallback"];
}) => {
  const engine = new Engine(rules);
  // todo: generic type for the record keys
  const situation: Record<string, PublicodesExpression> = {};
  let resolved;
  while (!resolved) {
    const result = engine.setSituation(situation).evaluate(key);
    const { missingKey, missingRule, missingQuestion } = getMissingVariable(
      rules,
      result
    );
    console.log({ missingKey, missingRule, missingQuestion });
    if (missingKey) {
      if (missingRule && !isStr(missingRule) && missingQuestion) {
        log("publicodes missingKey", missingKey);
        if (resolvers[missingKey]) {
          // call dummy resolver
          const resolver = resolvers[missingKey];
          if (resolver) {
            // eslint-disable-next-line no-await-in-loop
            const missingResolved = await runResolver({
              resolver,
              text: missingQuestion,
              questionCallback,
              commentCallback,
            });
            log(`publicodes resolver for ${missingKey}`, missingResolved);
            situation[missingKey] = toPublicodeValue(
              missingResolved.answer,
              rules
            );
          }
        } else {
          const schema = getRuleSchema(missingRule);
          // eslint-disable-next-line no-await-in-loop
          const missingResolved = await resolveLLM({
            question: missingQuestion,
            schema,
            questionCallback,
            commentCallback,
          });
          log(`publicodes resolveLLM for ${missingKey}`, {
            missingQuestion,
          });
          situation[missingKey] = toPublicodeValue(
            missingResolved.answer,
            rules
          );
        }
        log("publicodes situation", situation);
      }
    } else {
      resolved = result;
    }
  }
  return { situation, resolved };
};

export default resolvePublicodes;
