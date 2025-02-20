import React, { useEffect, useState } from 'react';
import axios from 'axios';

export const TestConnection: React.FC = () => {
    const [status, setStatus] = useState<string>('正在检查连接...');
    const [error, setError] = useState<string>('');

    const checkConnection = async () => {
        try {
            const response = await axios.get('http://localhost:8000/test-connection');
            setStatus(`连接成功: ${response.data.message}`);
            console.log('后端连接成功:', response.data);
        } catch (error) {
            setError(`连接失败: ${error.message}`);
            console.error('后端连接失败:', error);
        }
    };

    useEffect(() => {
        checkConnection();
    }, []);

    return (
        <div>
            <h2>前后端连接测试</h2>
            <p>状态: {status}</p>
            {error && <p style={{color: 'red'}}>错误: {error}</p>}
            <button onClick={checkConnection}>重新测试</button>
        </div>
    );
}; 