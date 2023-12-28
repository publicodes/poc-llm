"use client";

import Alert from "@codegouvfr/react-dsfr/Alert";
import Card from "@codegouvfr/react-dsfr/Card";
import Badge from "@codegouvfr/react-dsfr/Badge";

import { models } from "./publicodes/models";

const Links = () => {
  return (
    <div>
      {Object.keys(models).map((key) => {
        const model = models[key];
        return (
          <Card
            key={key}
            background
            border
            enlargeLink
            horizontal
            linkProps={{
              href: `/publicodes/${key}${document.location.hash}`,
            }}
            size="large"
            /*start={<ul className="fr-badges-group">
                <li>
                  <Badge>LABEL BADGE</Badge>
                </li>
                <li>
                  <Badge severity="new">LABEL BADGE</Badge>
                </li>
              </ul>}*/
            title={model.title}
            titleAs="h3"
          />
        );
      })}
    </div>
  );
};

export default function Page({ params }: { params: {} }) {
  const key = process.env.OPENAI_API_KEY || document.location.hash.slice(1);
  console.log("key", key);
  return (
    <div>
      <h1>Démo publi.codes + LLM</h1>
      {key ? (
        <Links />
      ) : (
        <Alert
          severity="error"
          title="Clé API manquante"
          description={
            <div>
              Ajouter une clé OpenAI à la fin de l'URL pour accéder au service
              <br />
              <br />
              Exemple : "#sk-flekjnfelrjgregjber"
            </div>
          }
        />
      )}
    </div>
  );
}
