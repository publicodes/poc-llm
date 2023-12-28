import readlinePromises from "node:readline/promises";
import { ResolverParams, SimpleRuleResolver } from "./resolvers";

export const uniq = <T>(arr: T[]): T[] => {
  return [...new Set(arr)];
};

export const askUser = async (
  rl: readlinePromises.Interface,
  question: string
): Promise<string> => {
  return rl.question("\n\n" + question + "\nUser: ");
};

export const toPublicodeValue = (str: unknown) => {
  if (str === true || str === "oui") {
    return "oui";
  }
  if (str === false || str === "non") {
    return "non";
  }
  //@ts-ignore
  if (!isNaN(str)) {
    //@ts-ignore
    return parseFloat(str);
  }
  return `'${str}'`;
};

export const log = (title: string, data: unknown) => {
  // if (!process.env.DEBUG) {
  console.log(`\n\n----\n${title}\n----\n${JSON.stringify(data)}\n\n`);
  //}
};

export const runResolver = async ({
  resolver,
  text,
  questionCallback,
  commentCallback,
}: {
  resolver: SimpleRuleResolver;
  text: string;
  questionCallback: ResolverParams["questionCallback"];
  commentCallback: ResolverParams["commentCallback"];
}) => {
  let finalAnswer: unknown;
  let comment: unknown;
  while (!finalAnswer) {
    // eslint-disable-next-line no-await-in-loop
    //const userAnswer = await questionCallback(text);
    const {
      result,
      question: nextQuestion,
      comment: resolverComment,
      // eslint-disable-next-line no-await-in-loop
    } = await resolver({ questionCallback, commentCallback });
    comment = resolverComment;
    if (!nextQuestion) {
      finalAnswer = result;
      break;
    }
    text = nextQuestion;
  }
  return { answer: finalAnswer, details: comment };
};
