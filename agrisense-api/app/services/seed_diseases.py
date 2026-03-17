import json
import logging
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_pinecone():
    try:
        pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        index_name = settings.PINECONE_INDEX_NAME
        
        # Check if index exists, if not, user must create it via dashboard as per plan
        # or we could attempt creation but usually needs dimensions
        index = pc.Index(index_name)
        
        embedder = SentenceTransformer('all-MiniLM-L6-v2')
        
        with open('diseases.json', 'r') as f:
            diseases = json.load(f)
            
        vectors = []
        for i, disease in enumerate(diseases):
            text_to_embed = f"Disease: {disease['name']} Crop: {disease['crop']} Symptoms: {disease['symptoms']}"
            embedding = embedder.encode(text_to_embed).tolist()
            
            # Prepare metadata (must be flat or handleable)
            metadata = {
                "name": disease["name"],
                "crop": disease["crop"],
                "scientific_name": disease["scientific_name"],
                "symptoms": disease["symptoms"],
                "organic_treatment": json.dumps(disease["organic_treatment"]),
                "chemical_treatment": json.dumps(disease["chemical_treatment"]),
                "prevention": disease["prevention"]
            }
            
            vectors.append({
                "id": f"disease_{i}",
                "values": embedding,
                "metadata": metadata
            })
            
            # Upsert in batches of 20
            if len(vectors) >= 20:
                index.upsert(vectors=vectors)
                logger.info(f"Upserted batch up to {i}")
                vectors = []
                
        if vectors:
            index.upsert(vectors=vectors)
            logger.info("Upserted final batch")
            
        logger.info("Pinecone seeding completed successfully.")
        
    except Exception as e:
        logger.error(f"Error seeding Pinecone: {e}")

if __name__ == "__main__":
    seed_pinecone()
