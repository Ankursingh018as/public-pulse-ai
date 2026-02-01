import re

# MOCK Preprocessor (No spaCy)

def clean_text(text: str) -> str:
    """
    Basic text cleaning
    """
    if not text:
        return ""
    
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Remove URLs
    text = re.sub(r'http\S+', '', text)
    
    return text

def extract_entities(text: str) -> dict:
    """
    Extract locations and other entities (Mock/Regex version)
    """
    entities = {
        "locations": [],
        "organizations": [],
        "dates": []
    }
    
    # Simple heuristic: capital words after "at", "in", "near" might be locations
    # e.g. "traffic at Genda Circle"
    loc_matches = re.findall(r'\b(at|in|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)', text)
    for _, loc in loc_matches:
        entities["locations"].append(loc)
        
    # Heuristic for potential organizations/landmarks (Capitalized words)
    # This is very naive but serves the purpose for dev without model
    
    return entities
