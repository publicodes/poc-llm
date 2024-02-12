// sum.test.js
import { expect, test, describe } from "vitest";
import { getRuleSchema } from "./publicodes";
import { zodToJsonSchema } from "zod-to-json-schema";

const tests = [
  {
    name: "simulation",
    rule: {
      titre: "Mode de simulation",
      description: "Choisissez un mode simulation",
      possibilités: ["max", "moyen"],
    },
    expected: {
      description: "Mode de simulation",
      type: "string",
    },
  },
  {
    name: "revenu",
    rule: {
      titre: "Revenu fiscal de référence",
      question: "Quel est votre revenu fiscal de référence ?",
      meta: { type: "entier" },
      suggestions: { bas: "20000 €", moyen: "50000 €", élevé: "80000 €" },
    },
    expected: {
      description: "Revenu fiscal de référence",
      type: "integer",
    },
  },
  {
    name: "proprietaire",
    rule: {
      question: "Êtes-vous propriétaire ?",
      "par défaut": "oui",
      description:
        "Pour bénéficier des aides à la rénovation, il faut être dans l'une de ces situations.",
    },
    expected: {
      description: "Êtes-vous propriétaire ?",
      enum: ["oui", "non"],
      type: "string",
    },
  },
  {
    name: "dpe",
    rule: {
      titre: "Votre DPE actuel",
      question: "Quel est le DPE actuel de votre logement ?",
      description:
        "Le DPE, c'est le Diagnostic de Performance Énergétique de votre logement.",
      aide: { G: 7, F: 6, E: 5, D: 4, C: 3, B: 2 },
    },
    expected: {
      description:
        'Votre DPE actuel\n\nchoisir parmi:\n - "B" (valeur 2)\n - "C" (valeur 3)\n - "D" (valeur 4)\n - "E" (valeur 5)\n - "F" (valeur 6)\n - "G" (valeur 7)',
      anyOf: [
        {
          const: 2,
          description: "B",
          type: "number",
        },
        {
          const: 3,
          description: "C",
          type: "number",
        },
        {
          const: 4,
          description: "D",
          type: "number",
        },
        {
          const: 5,
          description: "E",
          type: "number",
        },
        {
          const: 6,
          description: "F",
          type: "number",
        },
        {
          const: 7,
          description: "G",
          type: "number",
        },
      ],
    },
  },
  {
    name: "travaux",
    rule: {
      titre: "Votre enveloppe des travaux",
      question: "Quel est l'enveloppe totale hors taxe (HT) de vos travaux ?",
      suggestions: {
        basse: "10000 €",
        moyenne: "40000 €",
        haute: "70000 €",
      },
      description:
        "Notez que le taux de TVA des travaux de rénovation énergétique varie en fonction des gestes, de 5,5 % à 10 %.",
    },
    expected: {
      anyOf: [
        {
          const: "10000 €",
          description: "basse",
          type: "string",
        },
        {
          const: "70000 €",
          description: "haute",
          type: "string",
        },
        {
          const: "40000 €",
          description: "moyenne",
          type: "string",
        },
      ],
      description:
        'Votre enveloppe des travaux\n\nchoisir parmi:\n - "basse" (valeur 10000 €)\n - "haute" (valeur 70000 €)\n - "moyenne" (valeur 40000 €)',
    },
  },
  {
    name: "cdtn-liste",
    rule: {
      titre: "Origine du départ à la retraite",
      question:
        "L’employeur a-t-il décidé de lui-même de mettre à la retraite le salarié par une décision adressée à celui-ci ?",
      cdtn: {
        type: "liste",
        valeurs: {
          "Mise à la retraite": "oui",
          "Départ à la retraite": "non",
        },
      },
    },
    expected: {
      anyOf: [
        {
          const: "non",
          description: "Départ à la retraite",
          type: "string",
        },
        {
          const: "oui",
          description: "Mise à la retraite",
          type: "string",
        },
      ],
      description:
        'Origine du départ à la retraite\n\nchoisir parmi:\n - "Départ à la retraite" (valeur non)\n - "Mise à la retraite" (valeur oui)',
    },
  },
  {
    name: "meta-entier",
    rule: {
      titre: "Nombre d'enfants ?",
      question: "Combien d'enfants à charge ?",
      meta: {
        type: "entier",
      },
    },
    expected: {
      description: "Nombre d'enfants ?",
      type: "integer",
    },
  },
  {
    name: "guess-entier",
    rule: {
      question: "Quelle surface de rampants voulez-vous isoler ?",
      "par défaut": "60 m2",
    },
    expected: {
      description: "Quelle surface de rampants voulez-vous isoler ?",
      type: "integer",
    },
  },
];

describe("getRuleSchema", () => {
  describe.each(tests)(`getRuleSchema`, (t) => {
    test(`getRuleSchema ${t.name}`, () => {
      return expect(zodToJsonSchema(getRuleSchema(t.rule))).toEqual({
        $schema: "http://json-schema.org/draft-07/schema#",
        ...t.expected,
      });
    });
  });
});
