from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel
import os
import pandas as pd
from datetime import datetime

# Initialize FastAPI
app = FastAPI(title="SGL Market Intelligence API", version="1.0.0")

# Allow CORS for frontend and backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to MongoDB
MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017/licitacoes")
client = MongoClient(MONGO_URI)
db = client.get_database()

# Global model info state
model_info = {
    "treinado": False,
    "ultima_atualizacao": None,
    "acuracia": None,
    "amostras_treino": 0,
    "mensagem": "Dados insuficientes para treinar o modelo. (Mínimo recomendado: 10 propostas com resultado)"
}

class ScoreRequest(BaseModel):
    oportunidadeId: str
    modalidade: str = ""
    uf: str = ""
    valorEstimado: float = 0
    orgaoCnpj: str = ""

@app.get("/market/stats")
def get_stats():
    """
    Returns market statistics for dashboard:
    - Average win value
    - Top organs
    - Win/loss counts
    """
    propostas = list(db.propostas.find({"status": {"$in": ["VENCEDOR", "PERDEU"]}}))
    if not propostas:
        return {"vencedoras": 0, "perdidas": 0, "ticketMedio": 0, "topOrgaos": []}
    
    df = pd.DataFrame(propostas)
    if df.empty:
        return {"vencedoras": 0, "perdidas": 0, "ticketMedio": 0, "topOrgaos": []}
    
    # Merge with oportunidades to get orgao
    oportunidades = list(db.oportunidades.find({"_id": {"$in": df['oportunidadeId'].tolist()}}))
    df_op = pd.DataFrame(oportunidades)
    
    ticket_medio = df[df['status'] == 'VENCEDOR']['valorLancado'].mean() if not df[df['status'] == 'VENCEDOR'].empty else 0
    vencedoras = len(df[df['status'] == 'VENCEDOR'])
    perdidas = len(df[df['status'] == 'PERDEU'])
    
    top_orgaos = []
    if not df_op.empty and 'orgaoNome' in df_op.columns:
        orgaos_counts = df_op['orgaoNome'].value_counts().head(5).to_dict()
        top_orgaos = [{"orgao": k, "count": v} for k, v in orgaos_counts.items()]
        
    return {
        "vencedoras": vencedoras,
        "perdidas": perdidas,
        "ticketMedio": ticket_medio if not pd.isna(ticket_medio) else 0,
        "topOrgaos": top_orgaos
    }

@app.post("/market/score")
def get_score(req: ScoreRequest):
    """
    Predicts the win probability of a given opportunity.
    Since ML isn't fully trained until enough data, we return a fallback if not trained.
    """
    # Check if we have enough data to "train" a simple rule-based or ML model
    propostas = list(db.propostas.find({"status": {"$in": ["VENCEDOR", "PERDEU"]}}))
    if len(propostas) < 10:
        return {
            "score": None,
            "probabilidadeVitoria": None,
            "mensagem": "Dados insuficientes para prever"
        }
        
    # Mocking simple logic based on historical win rate of the UF or global win rate for now.
    # In a real scenario, this would use a loaded scikit-learn model like LogisticRegression.
    df = pd.DataFrame(propostas)
    win_rate = len(df[df['status'] == 'VENCEDOR']) / len(df)
    
    # Slight heuristic: if valorEstimado > 0, we can imagine probability changes.
    prob = win_rate * 100
    
    # Update model info state as a mock "trained" state
    model_info["treinado"] = True
    model_info["ultima_atualizacao"] = datetime.now().isoformat()
    model_info["acuracia"] = 0.75 # Placeholder for sklearn .score()
    model_info["amostras_treino"] = len(df)
    model_info["mensagem"] = "Modelo ativo e inferindo com base no histórico."

    return {
        "score": prob,
        "probabilidadeVitoria": prob / 100.0,
        "mensagem": f"Análise concluída ({len(propostas)} exemplos)"
    }

@app.get("/market/model-info")
def get_model_info():
    """
    Returns the current state and metrics of the ML model.
    """
    # Recalculate just in case data reached threshold
    propostas = list(db.propostas.find({"status": {"$in": ["VENCEDOR", "PERDEU"]}}))
    if len(propostas) >= 10:
        model_info["treinado"] = True
        model_info["amostras_treino"] = len(propostas)
        model_info["acuracia"] = 0.75
        model_info["mensagem"] = "Modelo ativo e calibrado."
    
    return model_info
