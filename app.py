from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
import os, json
from groq import Groq

load_dotenv()

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.1-8b-instant"

class Answer(BaseModel):
    question: str
    answer: str

@app.get("/", response_class=HTMLResponse)
def home():
    with open("templates/index.html", encoding="utf-8") as f:
        return f.read()

@app.get("/question")
def get_question(topic: str, level: str, mode: str):

    prompt = f"""
Ask ONE {level} level conceptual interview question from topic: {topic}.
NO coding questions.
"""

    res = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}]
    )

    return {"question": res.choices[0].message.content.strip()}

@app.post("/evaluate")
def evaluate(data: Answer):

    prompt = f"""
Evaluate the candidate answer.

Q: {data.question}
A: {data.answer}

Return ONLY JSON:
{{
 "score": number,
 "feedback": "short feedback",
 "explanation": "clear explanation"
}}
"""

    for _ in range(3):
        try:
            res = client.chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0
            )

            raw = res.choices[0].message.content.strip()
            parsed = json.loads(raw[raw.find("{"):raw.rfind("}")+1])
            return parsed
        except:
            continue

    return {"error": "Evaluation failed"}


# 🚀 For deployment
import os

port = int(os.environ.get("PORT", 8000))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=port)