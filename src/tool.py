# encoding: utf-8

import logging
import os
import sys
import openai
from llama_index.agent import OpenAIAgent
from llama_index.tools.function_tool import FunctionTool
from llama_index.tools.types import ToolMetadata

from typing import TypedDict

from pydantic.v1 import create_model, Field

from publicodes import get_rule, map_value, evaluate

if os.getenv("OPENAI_URL"):
    openai.api_base = os.getenv("OPENAI_URL")
    openai.verify_ssl_certs = False

logging.basicConfig(stream=sys.stdout, level=logging.INFO)


logger = logging.getLogger()

# handler = logging.StreamHandler(stream=sys.stdout)
# handler.setFormatter(LlamaIndexFormatter())
# logger.addHandler(handler)


ParametresCalcul = TypedDict("ParametresCalcul", {})


PROMPT_CONSEILLER_PREAVIS = """
Tu es un assistant en phase de test en charge d'estimer la durée de préavis à respecter en cas de départ à la retraite ou de mise à la retraite de ton interlocuteur.

Tu ne peux répondre qu'à des questions au sujet du préavis de départ à la retraite et tu ne dois PAS utiliser des connaissances générales ou sur le code du travail.

Tu ne dois pas estimer ou calculer toi-même le préavis de retraite mais utiliser la fonction get_next_question

La fonction get_next_question te renvoie les questions à poser à l'utilisateur. Tu ne dois pas poser d'autres questions que celles fournies par la fonction get_next_question.

Tu dois utiliser la définition de la fonction get_next_question pour choisir le nom des paramètres de calcul à lui envoyer.

Si la fonction get_next_question renvoie un nombre, commence par afficher les paramètres utilisés dans le calcul, puis :
    - affiche le résultat en nombre de jours arrondi au jour inférieur, avec une estimation en nombre de mois
    - indiques le site du code du travail numérique: https://code.travail.gouv.fr/outils/preavis-retraite

"""


def get_next_question(**parametres_calcul: ParametresCalcul) -> str | None:
    """
    Pour calculer le préavis de retraite. renvoie une question à poser à l'utilisateur ou un résultat en jours.
    """

    logger.debug("get_next_question", parametres_calcul or {})

    situation_publicodes = {
        key: map_value(value) for (key, value) in parametres_calcul.items()
    }

    logger.debug("\x1b[0m ⚙️ publicodes \x1b[0m")
    logger.debug(situation_publicodes)

    next_question, next_key, result = evaluate(
        "contrat salarié . préavis de retraite en jours", situation_publicodes
    )

    #
    # here we "infer" parameters types from publicodes definitions at runtime
    # and update the LLM function call signature
    # this looks necessary to enforce return types and parameter names
    #
    if next_question and next_key:
        parameters = situation_publicodes.copy()
        parameters[next_key] = ""
        # key type ?
        typed_parameters = {}
        for key in parameters.keys():
            rule = get_rule(key)
            description = rule.get("rawNode").get("question")
            node_type = rule.get("rawNode").get("cdtn", {}).get("type")
            if node_type == "oui-non":
                typed_parameters[key] = (
                    bool,
                    Field(description=description),
                )
            elif node_type == "entier":
                typed_parameters[key] = (
                    int,
                    Field(description=description),
                )
            elif node_type == "liste":
                values: list[str] = list(
                    map(
                        lambda a: a.strip("'"),
                        rule.get("rawNode").get("cdtn", {}).get("valeurs", {}).values(),
                    )
                )
                if "oui" in values and "non" in values and len(values) == 2:
                    typed_parameters[key] = (
                        bool,
                        Field(
                            description=description,
                        ),
                    )
                else:
                    typed_parameters[key] = (
                        str,
                        Field(
                            description=description
                            + " Autorise seulement une de ces réponses : "
                            + " ou ".join(map(lambda a: f"'{a}'", values)),
                            # enum force casting answers
                            json_schema_extra={
                                "enum": values,
                                #   "additionalProperties": False,
                            },
                        ),
                    )
            else:
                typed_parameters[key] = (
                    str,
                    Field(description=description),
                )
        for i, tool in enumerate(agent._tools):
            if tool.metadata.name == "get_next_question":
                agent._tools[i] = update_tool(get_next_question, typed_parameters)
        return next_question
    elif result:
        return result
    return None


def update_tool(fn, fields):
    """create a tool with custom fields schema"""
    global get_next_question_tool
    name = fn.__name__
    docstring = get_next_question.__doc__ or name
    description = docstring
    fn_schema = create_model(
        name,
        **fields,
    )
    tool_metadata = ToolMetadata(
        name=name, description=description, fn_schema=fn_schema
    )

    return FunctionTool(fn=fn, metadata=tool_metadata)


get_next_question_tool = update_tool(get_next_question, dict())

# from llama_index.llms import OpenAI

agent = OpenAIAgent.from_tools(
    [get_next_question_tool],
    verbose=True,
    system_prompt=PROMPT_CONSEILLER_PREAVIS,
    # llm=OpenAI(
    #     model="gpt-3.5-turbo-0613",
    #     temperature=0.1,
    #     # openai_proxy="http://127.0.0.1:8084",
    # ),
)


if __name__ == "__main__":
    print("\nex: Calcules moi mon préavis de retraite pour 24 mois d'ancienneté\n")
    agent.chat_repl()

# message = input("Human: ").encode("utf-8")  # "Calcules moi mon préavis de retraite"

# while message != "exit":
#     response = agent.chat(message)
#     print(f"Assistant: {response}\n")
#     message = input("Human: ").encode("utf-8")
