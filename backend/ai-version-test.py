import os
from google import genai

# Ensure your API key is set in your environment
# os.environ["GOOGLE_API_KEY"] = "your-api-key"

# The client automatically picks up the GOOGLE_API_KEY environment variable
client = genai.Client()

print("Available Models for Text Generation:")
print("-" * 40)

# Fetch and iterate through the models
for model in client.models.list():
    # Filter for models that support chat/text generation
    if "generateContent" in model.supported_actions:
        print(model.name)
