import os
import json
import requests

from typing import Any

PUBLICODES_API_URL = os.getenv("PUBLICODES_API_URL") or "http://127.0.0.1:3002"


def get_rule(name: str):
    r = requests.get(
        f"{PUBLICODES_API_URL}/rules/{name}",
        headers={"content-type": "application/json"},
    )
    return r.json()


def map_value(value: Any):
    if value is True or value == "oui":
        return "oui"
    elif value is False or value == "non":
        return "non"
    elif value == "":
        return None
    elif str(value).isdigit():
        return value
    return f"'{value}'"


def get_next_question_rule(data: dict):
    if not isinstance(data, dict):
        raise Exception("Invalid publicode API response")

    missingVariables: dict = data.get("evaluate", [{}])[0].get("missingVariables", {})
    if missingVariables:
        key = sorted(missingVariables.items(), key=lambda x: (x[1]), reverse=True)[0][0]
        rule = get_rule(key)
        return rule
    return None


def evaluate(expression: str, situation: dict):
    req = requests.post(
        f"{PUBLICODES_API_URL}/evaluate",
        data=json.dumps(
            {
                "situation": situation,
                "expressions": [expression],
            }
        ),
        headers={"content-type": "application/json"},
    )
    data = req.json()

    # print("===PUBLICODES/")
    # print("situation", situation)
    # print("result", data)
    # print("===/PUBLICODES")
    next_question_rule = get_next_question_rule(data)
    evaluations = data.get("evaluate", [{}])
    result = evaluations[0].get("nodeValue") if len(evaluations) else None

    next_question = next_key = None

    if next_question_rule:
        next_question = next_question_rule.get("rawNode", {}).get(
            "question", next_question_rule.get("title")
        )
        next_key = next_question_rule.get("rawNode", {}).get(
            "nom", next_question_rule.get("title")
        )
    return next_question, next_key, result
