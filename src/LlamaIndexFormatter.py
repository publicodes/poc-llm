import json
import logging
import re


GREY = "\x1b[38;20m"
GREEN = "\x1b[32;20m"
BLUE = "\x1b[34;20m"
YELLOW = "\x1b[33;20m"
RED = "\x1b[31;20m"
BOLD_RED = "\x1b[31;1m"
RESET = "\x1b[0m"


ROLES_EMOJIS = {
    "assistant": "🤖",
    "user": "💬",
    "function": "⚡️",
}

ROLES_COLORS = {
    "assistant": BLUE,
    "user": GREEN,
    "function": YELLOW,
}


def colorize(raw, color):
    return f"{color}{raw}{RESET}"


class LlamaIndexFormatter(logging.Formatter):
    data = {}

    def __init__(self):
        super(LlamaIndexFormatter, self).__init__()

    def format(self, record):
        input_data = {}
        if record.name == "openai":
            # print("------")
            # print(record.msg)
            # print("------")
            for data, message in re.findall(
                r"api_version=[^\s]+\sdata=\'(.*)\'\smessage=\'(.*)\'",
                record.msg,
            ):
                assert isinstance(data, str)
                assert isinstance(message, str)
                # print(data)
                message_data = json.loads(data.encode("utf-8").decode("unicode_escape"))
                print(
                    "⚙️",
                    colorize("functions", YELLOW),
                    "function call",
                    message_data.get("function_call"),
                )
                for func in message_data.get("functions", []):
                    print("\t", func.get("name"))
                    for property, schema in (
                        func.get("parameters", {}).get("properties", {}).items()
                    ):
                        print("\t\t", property)
                        for key, value in schema.items():
                            print("\t\t\t", key, ":", value)

                for msg in message_data.get("messages", []):
                    emoji = ROLES_EMOJIS.get(msg.get("role"), "💬")
                    color = ROLES_COLORS.get(msg.get("role"), "\x1b[38;20m")
                    print(emoji, colorize(msg.get("role"), color))
                    if msg.get("content"):
                        print("\t", msg.get("content"))
                    # print(msg.keys())
                    if msg.get("function_call"):
                        function_name = msg.get("function_call", {}).get("name")
                        print("\t", f"function_call: {function_name}")
                        for arg, value in json.loads(
                            msg.get("function_call", {}).get("arguments", "{}")
                        ).items():
                            print("\t\t", f"{arg}: {value}")
        else:
            print(record)
        return ""
