import logging
from typing import Optional
from langchain_community.chat_models import ChatOllama

logger = logging.getLogger(__name__)

async def generate_summary(text: str, max_length: Optional[int] = 500) -> str:
    """生成文本摘要"""
    try:
        # 初始化 Ollama LLM
        llm = ChatOllama(
            model="mistral",
            temperature=0.7
        )
        
        # 构建提示词
        prompt = f"""请为以下文本生成一个简短的摘要（不超过{max_length}字）：

{text}

摘要："""
        
        # 生成摘要
        response = await llm.ainvoke({"content": prompt})
        summary = response.content
        
        return summary.strip()
        
    except Exception as e:
        logger.error(f"Summary generation failed: {str(e)}")
        return "Failed to generate summary" 