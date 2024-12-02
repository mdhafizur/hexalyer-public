import openai
import os

class ChatGPTClient:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        openai.api_key = self.api_key

    def query(self, prompt, model="gpt-4"):
        try:
            response = openai.ChatCompletion.create(
                model=model,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message["content"]
        except Exception as e:
            print(f"ChatGPT API Error: {e}")
            return None
