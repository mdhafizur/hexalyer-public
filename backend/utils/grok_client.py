import requests

class XAIChatClient:
    def __init__(self, api_key, base_url="https://api.x.ai/v1"):
        """
        Initializes the X.AI Chat Client.

        :param api_key: API key for authentication.
        :param base_url: Base URL of the X.AI API.
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

    def chat_completion(self, messages, model="grok-beta", stream=False, temperature=0):
        """
        Sends a chat completion request to the X.AI API.

        :param messages: List of messages in the chat history (list of dicts with "role" and "content").
        :param model: Model name (default is "grok-beta").
        :param stream: Whether to enable streaming responses (default is False).
        :param temperature: Sampling temperature (default is 0).
        :return: Response JSON from the API.
        """
        url = f"{self.base_url}/chat/completions"
        payload = {
            "messages": messages,
            "model": model,
            "stream": stream,
            "temperature": temperature,
        }
        try:
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Error while making request to {url}: {e}")


