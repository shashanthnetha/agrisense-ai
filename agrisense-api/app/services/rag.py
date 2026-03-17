import json
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

pc = Pinecone(api_key=settings.PINECONE_API_KEY)
index = pc.Index(settings.PINECONE_INDEX_NAME)

# Load embedder
embedder = SentenceTransformer('all-MiniLM-L6-v2')

async def query_disease_knowledge(disease: str, crop: str):
    try:
        query_text = f"Disease: {disease} in Crop: {crop}"
        query_vector = embedder.encode(query_text).tolist()
        
        results = index.query(
            vector=query_vector,
            top_k=3,
            include_metadata=True
        )
        
        context = ""
        for match in results.matches:
            metadata = match.metadata
            context += f"\n--- Disease Info ---\n"
            context += f"Name: {metadata.get('name')}\n"
            context += f"Crop: {metadata.get('crop')}\n"
            context += f"Symptoms: {metadata.get('symptoms')}\n"
            context += f"Organic Treatment: {metadata.get('organic_treatment')}\n"
            context += f"Chemical Treatment: {metadata.get('chemical_treatment')}\n"
            context += f"Prevention: {metadata.get('prevention')}\n"
            
        return context if context else "No specific knowledge found in vector database."
    except Exception as e:
        logger.error(f"Error querying Pinecone: {e}")
        return "Error retrieving knowledge."
