"""
A simple shell interface for interacting with the XAIChatClient.
This script allows users to input prompts and receive responses.
"""

import json
from utils.grok_client import XAIChatClient
from utils.cybersecurity_expert_prompt import PROMPT1

# Replace with your actual API key
API_KEY = "xai-REDACTED"

# Initialize the XAIChatClient
client = XAIChatClient(API_KEY)

def main():
    """
    Main function for the XAI Chat Shell interface.
    Provides an interactive prompt for querying the XAIChatClient.
    """
    print("XAI Chat Shell")
    print("Type 'exit' to quit.\n")

    while True:
        # Get user input
        user_prompt = input("Enter your prompt: ")

        if user_prompt.lower() == "exit":
            print("Exiting XAI Chat Shell. Goodbye!")
            break

        # Prepare the message payload
        messages = [
            {"role": "system", "content": PROMPT1},
            {"role": "user", "content": user_prompt},
        ]

        try:
            # Query the XAIChatClient
            response = client.chat_completion(messages)

            # Print the response (formatted for JSON output)
            print("Response:")
            if isinstance(response, dict):
                print(json.dumps(response, indent=4))
            else:
                print(response)
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    main()
