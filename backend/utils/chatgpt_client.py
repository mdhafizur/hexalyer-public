import os
import logging
from dotenv import load_dotenv
from openai import OpenAI
from utils.cybersecurity_expert_prompt import AUTO_PROMPT, MANUAL_PROMPT

load_dotenv()


class ChatGPTClient:
    def __init__(self, api_key=None, model="gpt-4-turbo"):
        """
        Initialize the OpenAI client with an API key and model.
        :param api_key: OpenAI API key (default: uses environment variable `OPENAI_API_KEY`).
        :param model: OpenAI model to use (default: gpt-4-turbo).
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError(
                "API key must be provided or set in environment variables."
            )
        self.client = OpenAI(api_key=self.api_key)  # Initialize the OpenAI client
        self.model = model

    def ask(
        self,
        message,
        model=None,
        stream=True,
        temperature=0,
        system_prompt=None,
        message_history=None,
        prompt_type="manual",
    ):
        """
        Query the ChatGPT API with a cybersecurity scenario.
        :param message: The user's message.
        :param model: The model to use (default: the initialized model).
        :param stream: Whether to stream the response (default: True).
        :param temperature: Sampling temperature to use for randomness (default: 0).
        :param system_prompt: A custom system prompt, if provided.
        :param message_history: List of prior messages for context.
        :param prompt_type: "manual" or "auto" for default system prompts.
        :return: The streamed response (if stream=True) or the full response text.
        """
        if not message:
            raise ValueError("A message is required to query the ChatGPT API.")

        try:
            # Use the provided model or default to the initialized model
            model = model or self.model

            # Build the messages payload
            messages = [
                {
                    "role": "system",
                    "content": system_prompt
                    or (AUTO_PROMPT if prompt_type == "auto" else MANUAL_PROMPT),
                }
            ]
            if message_history:
                messages.extend(message_history)

            if message:
                messages.append({"role": "user", "content": message})

            # Handle streaming responses
            if stream:
                response = self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    stream=True,
                )
                for chunk in response:
                    if hasattr(chunk, "choices"):
                        for choice in chunk.choices:
                            if hasattr(choice, "delta") and hasattr(choice.delta, "content"):
                                yield choice.delta.content

            # Handle non-streaming responses
            else:
                response = self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                )
                return response["choices"][0]["message"]["content"]

        except Exception as e:
            logging.error(f"Error communicating with ChatGPT: {e}")
            return None
