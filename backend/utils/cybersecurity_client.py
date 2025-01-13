# utils/cybersecurity_client.py

from openai import OpenAI
import os
import json
from utils.cybersecurity_expert_prompt import AUTO_PROMPT
from dotenv import load_dotenv

load_dotenv()


class CyberSecurityClient:
    def __init__(self, api_key=None, model="gpt-4"):
        """
        Initialize the OpenAI client with an API key and model.
        :param api_key: OpenAI API key (default: uses environment variable `OPENAI_API_KEY`).
        :param model: OpenAI model to use (default: gpt-4).
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        self.client = OpenAI(api_key=self.api_key)  # Initialize the OpenAI client
        self.conversation_history = [{"role": "system", "content": AUTO_PROMPT}]

    def ask(self, prompt):
        """
        Query the ChatGPT API with a cybersecurity scenario.
        :param prompt: The specific prompt of the cybersecurity scenario.
        :return: The structured JSON response from ChatGPT as a string.
        """
        try:
            # Add user input to the conversation history
            self.conversation_history.append({"role": "user", "content": prompt})

            # Make the API call
            response = self.client.chat.completions.create(
                model=self.model, messages=self.conversation_history
            )

            # Extract the assistant's message content
            assistant_response = response.choices[0].message.content

            # Add the assistant's response to the conversation history
            self.conversation_history.append(
                {"role": "assistant", "content": assistant_response}
            )

            # Clean and parse the response
            cleaned_response = assistant_response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]  # Remove ```json
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]  # Remove closing ```
            # Replace escaped characters
            cleaned_response = cleaned_response.replace("\n", "").replace('"', '"')

            # Attempt to parse the response as JSON
            try:
                return json.loads(cleaned_response)
            except json.JSONDecodeError:
                # Return raw response if it isn't valid JSON
                return {"raw_response": cleaned_response}
        except Exception as e:
            print(f"Error communicating with ChatGPT: {e}")
            return None
