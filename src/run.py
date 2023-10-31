import sys
import logging
import streamlit as st

from LlamaIndexFormatter import LlamaIndexFormatter
from tool import agent

#
# this is "just" the streamlit UI wrapper around the llama_index agent
#

logging.basicConfig(stream=sys.stdout, level=logging.INFO)

logger = logging.getLogger()

# handler = logging.StreamHandler(stream=sys.stdout)
# handler.setFormatter(LlamaIndexFormatter())
# logger.addHandler(handler)

st.set_page_config(
    page_title="LLM + publicodes = ❤️",
    page_icon="🐫",
    layout="centered",
    initial_sidebar_state="auto",
    menu_items=None,
)
st.header("LLM + publicodes = ❤️")
# st.title(
#     "Interrogez le modèle publicodes de calcul de préavis de retraite (expérimental)"
# )
st.info(
    """
Interrogez le modèle publicodes de calcul de préavis de retraite (expérimental)

Si on vous demande la convention collective, répondre IDCC1979 ou IDCC1043 par exemple (WIP)

Exemple : Quel est mon préavis de retraite ?

RDV [sur GitHub](https://github.com/SocialGouv/publicodes-llm) pour en discuter""".format(),
    icon="💡",
)


if "messages" not in st.session_state.keys():  # Initialize the chat message history
    st.session_state.messages = [
        # {
        #     "role": "user",
        #     "content": "Peux tu me calculer mon préavis de retraite ?",
        # }
    ]


# chat_engine = index.as_chat_engine(
#     chat_mode="context", verbose=True, similarity_top_k=5
# )


if prompt := st.chat_input("A votre écoute :)"):
    st.session_state.messages.append({"role": "user", "content": prompt})

# prompt = "Peux tu me calculer mon préavis de retraite ?"

for message in st.session_state.messages:  # Display the prior chat messages
    with st.chat_message(message["role"]):
        st.write(message["content"])

# if not st.session_state.messages:
#     st.session_state.messages.append(
#         {
#             "role": "user",
#             "content": "Peux tu me calculer mon préavis de retraite ?",
#         }
#     )

if st.session_state.messages and st.session_state.messages[-1]["role"] == "user":
    with st.chat_message("assistant"):
        with st.spinner("Je refléchis..."):
            # print("prompt", prompt)
            message_placeholder = st.empty()
            query = prompt or not st.session_state.messages
            if prompt:
                streaming_response = agent.stream_chat(prompt)

                # streaming_response.print_response_stream()

                full_response = ""
                for text in streaming_response.response_gen:
                    full_response += text
                    message_placeholder.markdown(full_response)

                if full_response:
                    st.session_state.messages.append(
                        {"role": "assistant", "content": full_response}
                    )
