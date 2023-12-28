import { z } from "zod";

import kaliData from "./kali-data.json";
import { uniq, log } from "../../utils";

export const RechercheEntrepriseParameters = z.object({
  name: z.string().describe("Nom de l'entreprise"),
  city: z.string().describe("Ville de l'entreprise"),
});

type RechercheEntrepriseResult = {
  nom_complet: string;
  siege?: { liste_idcc?: string[] };
  matching_etablissements?: { liste_idcc?: string[] }[];
};
type RechercheEntrepriseResults = { results: RechercheEntrepriseResult[] };

const fetchEntreprises = (
  text: string,
  location: string
): Promise<RechercheEntrepriseResults> => {
  const url = `https://recherche-entreprises.api.gouv.fr/search`;
  return fetch(
    `${url}?convention_collective_renseignee=true&q=${encodeURIComponent(
      `${text} ${location}`
    )}`
  ).then((r) => {
    return r.json() as Promise<RechercheEntrepriseResults>;
  });
};

const getKaliNameFromIdcc = (idcc: string) => {
  return kaliData.find((convention) => {
    return convention.idcc === parseInt(idcc);
  })?.title;
};

export async function rechercheConventionParEntreprise(
  args: z.infer<typeof RechercheEntrepriseParameters>
) {
  log("rechercheConventionParEntreprise", args);
  const search = await fetchEntreprises(args.name, args.city);
  if (search.results.length) {
    const entreprises = search.results.map((result) => {
      return {
        entreprise: result.nom_complet,
        conventions: uniq<string>([
          ...(result.siege?.liste_idcc || []),
          ...((result.matching_etablissements?.length &&
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            result.matching_etablissements.flatMap((e) => {
              return e.liste_idcc || [];
            })) ||
            []),
        ]).map((idcc) => {
          return {
            title: getKaliNameFromIdcc(idcc),
            idcc,
          };
        }),
      };
    });
    log("entreprises", entreprises);
    return {
      choices: entreprises,
    };
  }
  return {
    choices: [],
  };
}
