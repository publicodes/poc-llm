import Engine, {
  Rule,
  EvaluatedNode,
  PublicodesExpression,
  RuleNode,
} from "publicodes";
import { toPublicodeValue, log, runResolver } from "../utils";
import { ZodSchema, z } from "zod";
import { SimpleRuleResolver, ResolverParams } from ".";
import { resolveConventionCollective } from "./conventions";
import { resolveLLM } from "./llm";
import { zodToJsonSchema } from "zod-to-json-schema";

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

const makeChoiceDescription = (choices) =>
  `\n\nchoisir parmi:\n${Object.entries(choices)
    .sort()
    .map(
      ([k, v]) =>
        ` - "${cleanPublicodeStr(k)}" (valeur ${cleanPublicodeStr(v)})`
    )
    .join("\n")}`;

const cleanPublicodeStr = (str: any) =>
  (isStr(str) && str.replace(/^'(.*)'$/, "$1")) || str;

export const getRuleSchema = (rule: CdtnRuleNode): ZodSchema => {
  const nodeType = rule.cdtn?.type || rule.meta?.type;
  const describe = `${rule.titre || rule.question}${
    rule.unité ? ` (en ${rule.unité})` : ``
  }`;
  let fieldSchema: ZodSchema = z.string().describe(describe);
  if (nodeType === "oui-non") {
    fieldSchema = z.enum(["oui", "non"]).describe(describe);
  } else if (nodeType === "entier") {
    fieldSchema = z.number().int().describe(describe);
  } else if (nodeType === "liste") {
    // todo: use some convention instead of "cdtn"
    const root = (rule.cdtn && rule.cdtn.valeurs) || rule.meta?.valeurs;
    if (root && Object.values(root || []).length) {
      const schemas = Object.entries(root)
        .sort()
        .map(([key, label]) =>
          z.literal(cleanPublicodeStr(label)).describe(key)
        );

      if (schemas.length) {
        fieldSchema = z
          .union(schemas)
          .describe(describe + makeChoiceDescription(root));
      }
    }
  } else if (rule.suggestions && Object.values(rule.suggestions).length) {
    const schemas = Object.entries(rule.suggestions)
      .sort()
      .map(([key, label]) => z.literal(cleanPublicodeStr(label)).describe(key));

    if (schemas.length) {
      fieldSchema = z
        .union(schemas)
        .describe(describe + makeChoiceDescription(rule.suggestions));
    }
  } else if (rule.aide && Object.values(rule.aide).length > 0) {
    const schemas = Object.entries(rule.aide)
      .sort()
      .map(([key, aide]) => z.literal(cleanPublicodeStr(aide)).describe(key));

    if (schemas.length) {
      fieldSchema = z
        .union(schemas)
        .describe(describe + makeChoiceDescription(rule.aide));
    }
  } else if (rule["par défaut"] === "oui" || rule["par défaut"] === "non") {
    fieldSchema = z.enum(["oui", "non"]).describe(describe);
  } else if (isStr(rule["par défaut"]) && rule["par défaut"].match(/^\d+\s/)) {
    fieldSchema = z.number().int().describe(describe);
  }
  console.log(rule, fieldSchema);
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

const resolveFields = async ({
  question,
  fields,
  rules,
  questionCallback,
  commentCallback,
}: {
  question: string;
  fields: string[];
  rules: Record<string, string | CdtnRuleNode>;
  questionCallback: ResolverParams["questionCallback"];
  commentCallback: ResolverParams["commentCallback"];
}): Promise<Record<string, PublicodesExpression>> => {
  // call LLM
  // console.log("question", question);
  const schema = z.object(
    fields.reduce((a, field) => {
      console.log("field", field, rules[field]);
      return {
        ...a,
        [field]: rules[field] && getRuleSchema(rules[field]).optional(),
      };
    }, {})
  );
  //console.log("schema", schema);
  //return fields.reduce((a, c) => ({ ...a, [c]: 0 }), {});

  const missingResolved = await resolveLLM({
    question,
    schema,
    //additionalPrompt,
    questionCallback,
    commentCallback,
  });

  return missingResolved.answer;
};

export const resolvePublicodes = async ({
  intro,
  introRules,
  rules,
  key,
  resolvers = defaultResolvers,
  questionCallback = defaultQuestionCallback,
  commentCallback = defaultCommentCallback,
}: {
  // todo: generic type for the record keys
  intro?: string;
  introRules?: string[];
  rules: Record<string, string | CdtnRuleNode>;
  key: string;
  resolvers?: Record<string, SimpleRuleResolver>;
  questionCallback: ResolverParams["questionCallback"];
  commentCallback: ResolverParams["commentCallback"];
}) => {
  const engine = new Engine(rules);
  // todo: generic type for the record keys
  let situation: Record<string, PublicodesExpression> = {};
  let resolved;
  let counter = 0;
  while (!resolved && counter < 50) {
    counter += 1;
    if (counter === 1 && intro && introRules && introRules.length) {
      //update situation from intro question if any
      const resolvedFields = await resolveFields({
        question: intro,
        fields: introRules,
        rules,
        questionCallback,
        commentCallback,
      });
      situation = {
        ...situation,
        ...Object.keys(resolvedFields).reduce(
          (a, c) => ({ ...a, [c]: toPublicodeValue(resolvedFields[c], rules) }),
          {}
        ),
      };
    }
    const result = engine.setSituation(situation).evaluate(key);
    const { missingKey, missingRule, missingQuestion } = getMissingVariable(
      rules,
      result
    );
    console.log({ counter, result, missingKey, missingRule, missingQuestion });
    if (missingKey) {
      if (missingRule && !isStr(missingRule) && missingQuestion) {
        log("publicodes missingKey", missingKey);
        // call dummy resolver
        const resolver = resolvers[missingKey];
        //console.log("resolver", resolver);
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
        } else {
          const schema = getRuleSchema(missingRule);
          // eslint-disable-next-line no-await-in-loop
          const additionalPrompt = "";
          const missingResolved = await resolveLLM({
            question: missingQuestion,
            schema,
            additionalPrompt,
            questionCallback,
            commentCallback,
          });
          log(`publicodes resolveLLM for ${missingKey}`, {
            missingQuestion,
            schema,
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
  log("publicodes resolved or timed-out", { counter, situation });
  return { situation, resolved };
};

export default resolvePublicodes;
