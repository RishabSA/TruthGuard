from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import Response
from pydantic import BaseModel, HttpUrl
from typing import Optional
import requests
from bs4 import BeautifulSoup
import numpy as np
import onnxruntime as ort
from transformers import DistilBertTokenizerFast
from contextlib import asynccontextmanager
from huggingface_hub import hf_hub_download

# Run command: uvicorn main:app --reload --host 0.0.0.0 --port 8000


# Request schemas
class ScrapeRequest(BaseModel):
    url: HttpUrl


class PredictRequest(BaseModel):
    text: Optional[str] = None
    url: Optional[HttpUrl] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load tokenizer at startup
    tokenizer = DistilBertTokenizerFast.from_pretrained("distilbert-base-uncased")

    # Download and load ONNX model
    onnx_path = hf_hub_download(
        repo_id="RishabA/TruthGuard", filename="truth_guard_int8.onnx"
    )
    session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
    # Store tokenizer and session in app state
    app.state.tokenizer = tokenizer
    app.state.session = session

    yield


app = FastAPI(title="TruthGuard API", lifespan=lifespan)

origins = [
    "http://localhost:5173",
    "https://truthguard.app",
    "https://truth-guard-server.onrender.com",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


MAX_LEN = 512


@app.post("/scrape")
def scrape_content(req: ScrapeRequest):
    try:
        print("Scrape request sent")
        headers = {"User-Agent": "TruthGuardBot/1.0"}
        resp = requests.get(req.url, headers=headers, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # Prefer <article>, <main>, then fall back to <body>
        block = soup.select_one("article") or soup.select_one("main") or soup.body
        text = block.get_text(separator=" ", strip=True)

        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scrape error: {e}")


@app.post("/predict")
def predict(req: PredictRequest):
    print("Predict request sent")
    tokenizer = app.state.tokenizer
    session = app.state.session

    # Determine input text
    input_text = req.text
    if req.url:
        scrape_resp = scrape_content(ScrapeRequest(url=req.url))
        input_text = scrape_resp.get("text")

    if not input_text:
        raise HTTPException(status_code=400, detail="No input text provided")

    # Tokenize
    enc = tokenizer(
        input_text,
        padding="max_length",
        truncation=True,
        max_length=MAX_LEN,
        return_tensors="np",
    )

    # Prepare inputs for ONNX
    input_ids = enc["input_ids"].astype(np.int64)
    attention_mask = enc["attention_mask"].astype(np.int64)
    ort_inputs = {
        session.get_inputs()[0].name: input_ids,
        session.get_inputs()[1].name: attention_mask,
    }

    ort_outs = session.run(None, ort_inputs)
    logit = ort_outs[0].squeeze().item()
    # Apply sigmoid
    prob = 1.0 / (1.0 + np.exp(-logit))
    print(f"Probability: {prob}")

    return {"probability": prob}
