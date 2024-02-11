import { ZodSchema, z } from "zod";

const resolverParams = z.object({
  question: z.string().describe("Question pour l'utilisateur"),
  schema: z.instanceof(ZodSchema),
  model: z.string().optional(),
  additionalPrompt: z.string.optional(),
  questionCallback: z
    .function()
    .args(z.string())
    .returns(z.promise(z.string())),
  commentCallback: z.function().args(z.string()),
});

type ResolverParams = z.infer<typeof resolverParams>;

type ResolverResult<T> = {
  details?: string;
  answer?: T;
};

type SimpleRuleResolver = (arg0: {
  questionCallback: ResolverParams["questionCallback"];
  commentCallback: ResolverParams["commentCallback"];
}) => Promise<ResolverResult>;
