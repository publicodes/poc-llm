import streamlit as st

from tool import agent

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

S'il vous demande la convention collective, répondre IDCC1979 ou IDCC1043 par exemple (WIP)

Commencez par lui demander de calculer votre préavis de retraite pour lancer la conversation

RDV [sur GitHub](https://github.com/SocialGouv/publicodes-llm) pour en discuter""".format(),
    icon="💡",
)


if "messages" not in st.session_state.keys():  # Initialize the chat message history
    st.session_state.messages = [
        # {
        #     "role": "assistant",
        #     "content": "Bienvenue 🤗",
        # }
    ]


# chat_engine = index.as_chat_engine(
#     chat_mode="context", verbose=True, similarity_top_k=5
# )

if prompt := st.chat_input("A votre écoute :)"):
    st.session_state.messages.append({"role": "user", "content": prompt})

for message in st.session_state.messages:  # Display the prior chat messages
    with st.chat_message(message["role"]):
        st.write(message["content"])

if not st.session_state.messages or st.session_state.messages[-1]["role"] == "user":
    with st.chat_message("assistant"):
        with st.spinner("Je refléchis..."):
            message_placeholder = st.empty()
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
