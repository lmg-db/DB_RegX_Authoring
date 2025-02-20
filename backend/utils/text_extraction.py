import io
from pypdf import PdfReader
from docx import Document
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

def extract_text(file_obj: io.BytesIO, filename: str) -> str:
    """从文件中提取文本内容"""
    try:
        if filename.lower().endswith('.pdf'):
            # 处理PDF文件
            reader = PdfReader(file_obj)
            text = ""
            for page in reader.pages:
                text += page.extract_text()
            return text
            
        elif filename.lower().endswith(('.docx', '.doc')):
            # 处理Word文档
            doc = Document(file_obj)
            return "\n".join([paragraph.text for paragraph in doc.paragraphs])
            
        elif filename.lower().endswith('.txt'):
            # 处理文本文件
            return file_obj.read().decode('utf-8')
            
        else:
            raise ValueError(f"Unsupported file type: {filename}")
            
    except Exception as e:
        logger.error(f"Text extraction failed for {filename}: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to extract text from {filename}: {str(e)}"
        ) 