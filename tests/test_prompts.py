def test_create_prompt(client):
    response = client.post("/api/prompts", json={
        "title": "测试模板",
        "content": "测试内容",
        "model_type": "generation",
        "scope": "team"
    })
    assert response.status_code == 200
    assert response.json()["title"] == "测试模板" 