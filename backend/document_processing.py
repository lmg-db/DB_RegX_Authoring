from pdfminer.high_level import extract_text as extract_pdf_text
from docx import Document as DocxDocument
import torch
from transformers import AutoModelForCausalLM

def extract_text(content: bytes, filename: str) -> str:
    if filename.endswith('.pdf'):
        return extract_pdf_text(io.BytesIO(content))
    elif filename.endswith('.docx'):
        doc = DocxDocument(io.BytesIO(content))
        return "\n".join([p.text for p in doc.paragraphs])
    elif filename.endswith('.txt'):
        return content.decode('utf-8')
    else:
        raise ValueError("Unsupported file format")

async def analyze_with_llm(model: str, prompt: str, max_tokens: int):
    # 实际实现应包含设备检测
    device = "mps" if torch.backends.mps.is_available() else "cpu" # 自动检测MPS可用性
    model = AutoModelForCausalLM.from_pretrained(model).to(device) # 自动切换设备
    # 实现大模型调用逻辑
    # 示例实现：
    from transformers import pipeline
    generator = pipeline('text-generation', model=model)
    result = generator(prompt, max_length=max_tokens)
    return result[0]['generated_text'] 