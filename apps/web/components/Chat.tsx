import Markdown from "react-markdown";
import { KeyboardEventHandler, useRef } from "react";

import { fr } from "@codegouvfr/react-dsfr";

import { Input } from "@codegouvfr/react-dsfr/Input";
import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { Button } from "@codegouvfr/react-dsfr/Button";

import { models } from "../app/publicodes/models";

import { usePublicodesResolver } from "../lib/usePublicodesResolver";

export type ChatMessage = { role: string; content: string };

const Messages = ({ messages }: { messages: ChatMessage[] }) => {
  return (
    <>
      {messages.map((m, i) => (
        <div key={m.role + m.content + i}>
          {m.role === "user" ? (
            <div>
              <i className={fr.cx("ri-user-2-fill")} /> Vous:
            </div>
          ) : (
            <div>
              <i className={fr.cx("ri-robot-2-fill")} /> Assistant:
            </div>
          )}
          <Markdown
            components={{
              p: (props) => {
                const { node, ...rest } = props;
                return <p className={fr.cx("fr-text--xl")} {...rest} />;
              },
            }}
          >
            {m.content}
          </Markdown>
        </div>
      ))}
    </>
  );
};

export const Chat = ({ model }: { model: keyof typeof models }) => {
  const input = useRef<HTMLInputElement>(null);

  const selectedModel = models[model];

  const { messages, addMessage, waitingAnswer, finished } =
    usePublicodesResolver(selectedModel);

  const sendUserMessage = () => {
    const text = input.current?.value;
    if (text) {
      const message = { role: "user", content: text };
      input.current.value = "";
      if (waitingAnswer) {
        waitingAnswer.resolve(text);
      }
      addMessage(message);
    }
  };

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.code === "Enter") {
      sendUserMessage();
    }
  };

  const restart = () => {
    document.location.reload();
  };

  return (
    <div
      className="fr-grid-row fr-grid-row--gutters"
      style={{ flex: 1, flexDirection: "column" }}
    >
      <div className="fr-col-12" style={{ flex: "0 0 auto" }}>
        <h1>{selectedModel.title}</h1>
        <Alert
          severity="warning"
          title="ChatBot expérimental"
          description={
            <>
              Ce ChatBot est expérimental et peut délivrer des réponses
              incorrectes.
              {selectedModel.warning}
            </>
          }
        />
      </div>
      <div className="fr-col-12" style={{ flexGrow: 1 }}>
        <Messages messages={messages} />
        {!waitingAnswer && !finished && (
          <div>
            <i className={fr.cx("ri-loader-2-fill")} />
            &nbsp;Je réfléchis......
          </div>
        )}
      </div>
      <div className="fr-col-12">
        {(!finished && (
          <Input
            iconId="ri-mail-send-line"
            label="Message à envoyer"
            nativeInputProps={{
              ref: input,
              onKeyDown: onKeyDown,
              readOnly: !waitingAnswer,
            }}
          />
        )) || <Button onClick={restart}>Recommencer</Button>}
      </div>
    </div>
  );
};
