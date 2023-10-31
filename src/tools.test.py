import openai

openai.api_base = "http://127.0.0.1:8084"
openai.verify_ssl_certs = False

# openai.proxy = {"http": "http://127.0.0.1:8084", "https": "http://127.0.0.1:8084"}

import re
from tool import agent


cases = [
    {
        "inputs": [
            "Calcules moi mon préavis de retraite",
            "IDCC1979",  # contrat salarié . convention collective
            "88",  # contrat salarié . ancienneté
            "oui",  # contrat salarié . mise à la retraite
            "cadre supérieure",  # contrat salarié .  convention collective . hotels cafes restaurants . catégorie professionnelle
            "non",  # contrat salarié .travailleur handicapé
        ],
        "expectations": ["91 jours"],
    },
    {
        "inputs": [
            "Calcules moi mon préavis de retraite",
            "IDCC1979",  # contrat salarié . convention collective
            "88",  # contrat salarié . ancienneté
            "oui",  # contrat salarié . mise à la retraite
            "secretaire",  # contrat salarié .  convention collective . hotels cafes restaurants . catégorie professionnelle
            "non",  # contrat salarié .travailleur handicapé
        ],
        "expectations": ["60 jours"],
    },
    {
        "inputs": [
            "Calcules moi mon préavis de retraite",
            "IDCC1043",  # contrat salarié . convention collective
            "oui",  # contrat salarié . mise à la retraite
            "88",  # contrat salarié . ancienneté
            "A",  # contrat salarié .  convention collective . gardien concierge . catégorie professionnelle
            "non",  # contrat salarié .travailleur handicapé
        ],
        "expectations": ["60 jours"],
    },
]


# IDCC1043

for case in cases:
    agent.reset()
    inputs = case.get("inputs", [])
    response = None
    for input_data in inputs:
        response = agent.chat(input_data)
    assert response is not None
    for expectation in case.get("expectations", []):
        assert expectation in str(
            response
        ), f"'{expectation}' not found in '{response}'"
