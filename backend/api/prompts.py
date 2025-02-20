from fastapi import APIRouter, Request
from fastapi import Body
from datetime import datetime
import uuid
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from fastapi import HTTPException
import json
from database import get_db
import logging

app = APIRouter()

logger = logging.getLogger(__name__)

class PromptCreate(BaseModel):
    title: str = Field(..., min_length=1, example="CSR生成模板")
    content: str = Field(..., min_length=10, example="请根据以下内容生成临床研究报告...")
    model_type: Literal['generation', 'compliance'] = Field(
        ..., 
        example="generation",
        description="提示词类型: generation-生成类, compliance-合规检查类"
    )
    scope: Literal['user', 'team'] = Field(
        ..., 
        example="team",
        description="提示词作用域: user-用户级, team-团队级"
    )
    # 以下为可选字段
    task: Optional[str] = None
    templates: List[str] = []

class PromptUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    model_type: Optional[Literal['generation', 'compliance']] = None
    scope: Optional[Literal['user', 'team']] = None
    task: Optional[str] = None
    templates: Optional[List[str]] = None

# 添加响应模型
class PromptResponse(BaseModel):
    id: str
    title: str
    content: str
    model_type: str
    scope: str
    created_at: datetime

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

@app.post("/api/prompts")
async def create_prompt(request_data: PromptCreate = Body(...)):
    logger.info("开始处理创建提示词请求")
    try:
        new_id = str(uuid.uuid4())
        with get_db() as conn:
            logger.debug("获取数据库连接成功")
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO prompts 
                (id, title, content, model_type, scope, task, templates, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                new_id,
                request_data.title,
                request_data.content,
                request_data.model_type,
                request_data.scope,
                request_data.task,
                json.dumps(request_data.templates),
                datetime.now().isoformat()
            ))
            conn.commit()
            logger.info("数据插入成功，ID: %s", new_id)

        # 构造响应数据
        return {
            "id": new_id,
            **request_data.dict(),
            "created_at": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error("处理请求时发生异常", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

# @app.put("/api/prompts/{prompt_id}")
# async def update_prompt(prompt_id: str, prompt: PromptUpdate):
#     return {"message": "Prompt updated"}

# 异常处理器需要注册到FastAPI app实例，而不是APIRouter
# @app.exception_handler(RequestValidationError)
# async def validation_exception_handler(request, exc):
#     return JSONResponse(
#         status_code=422,
#         content={
#             "detail": "Validation Error",
#             "errors": exc.errors()
#         },
#     ) 

# 删除调试语句 

@app.get("/api/prompts", response_model=List[PromptResponse])
async def list_prompts(scope: Optional[str] = None):
    with get_db() as conn:
        cursor = conn.cursor()
        if scope:
            cursor.execute("SELECT * FROM prompts WHERE scope = ?", (scope,))
        else:
            cursor.execute("SELECT * FROM prompts")
        return [
            {
                "id": row[0],
                "title": row[1],
                "content": row[2],
                "model_type": row[3],
                "scope": row[4],
                "task": row[5],
                "templates": json.loads(row[6]),
                "created_at": row[7]
            }
            for row in cursor.fetchall()
        ] 

@app.post("/api/categories")
async def create_category(category: CategoryCreate):
    # TODO: 实现分类创建逻辑
    return {"message": "分类创建功能待实现"} 