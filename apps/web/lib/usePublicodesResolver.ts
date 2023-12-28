import { useCallback, useEffect, useRef, useState } from "react";

import resolvePublicodes from "@repo/resolvers/resolvePublicodes";

import { deferred } from "../app/utils";
import { PublicodeModelDefinition } from "../app/publicodes/models";

import { ChatMessage } from "../components/Chat";

type DeferedMessage = ReturnType<typeof deferred<string>>;

export const usePublicodesResolver = (model: PublicodeModelDefinition) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [resolverInstance, setResolverInstance] = useState<any>();
  const [waitingAnswer, setWaitingAnswer] = useState<DeferedMessage>();
  const initialized = useRef(false);
  const [finished, setFinished] = useState<boolean>(false);

  //const resolverInstance = useRef({ from, to });
  const addMessage = (message: ChatMessage) =>
    setMessages((messages) => [...messages, message]);

  useEffect(() => {
    setResolverInstance(initResolver());
  }, []);

  const initResolver = useCallback(() => {
    // return;
    if (initialized.current) return resolverInstance;
    initialized.current = true;
    return resolvePublicodes({
      ...model,
      questionCallback: (question: string) => {
        const message = { role: "assistant", content: question };
        addMessage(message);
        const deferedAnswer = deferred<string>();
        setWaitingAnswer(deferedAnswer);
        return deferedAnswer.promise.then((res) => {
          setWaitingAnswer(undefined);
          return res;
        });
      },
      commentCallback: (comment: string) => {
        const message = { role: "assistant", content: comment };
        addMessage(message);
      },
    }).then(({ situation, resolved }) => {
      setWaitingAnswer(undefined);
      setFinished(true);
      const message = {
        role: "assistant",
        content: model.getConclusion({ situation, resolved }),
      };
      addMessage(message);
    });
  }, []);

  return {
    messages,
    addMessage,
    waitingAnswer,
    finished,
  };
};
