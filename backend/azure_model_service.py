import os
import logging
from typing import Optional, Dict, Any
from openai import AsyncAzureOpenAI
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class AzureModelService:
    def __init__(self):
        self._client = None
        self._initialized = False
        
    async def initialize(self):
        """异步初始化客户端"""
        try:
            self._client = AsyncAzureOpenAI(
                api_key=os.getenv("AZURE_API_KEY"),
                api_version=os.getenv("AZURE_API_VERSION", "2024-05-01-preview"),
                azure_endpoint=os.getenv("AZURE_API_BASE"),
            )
            self._initialized = True
            logger.info("Azure model service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Azure client: {str(e)}")
            self._initialized = False
            raise

    async def generate_response(
        self,
        prompt: str,
        model_type: str = "gpt-4o",
        max_tokens: int = 1000,
        temperature: float = 0.7,
        **kwargs
    ) -> Dict[str, Any]:
        """
        调用Azure OpenAI生成响应
        参数与本地模型接口保持一致
        """
        if not self._initialized:
            await self.initialize()
            
        try:
            response = await self._client.chat.completions.create(
                model=model_type,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
                **kwargs
            )
            
            return {
                "response": response.choices[0].message.content,
                "model": model_type,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }
            }
            
        except Exception as e:
            logger.error(f"Azure API call failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Azure API Error: {str(e)}"
            )

# 单例服务实例
azure_service = AzureModelService()

async def get_azure_service():
    """获取Azure服务实例的依赖函数"""
    if not azure_service._initialized:
        await azure_service.initialize()
    return azure_service 