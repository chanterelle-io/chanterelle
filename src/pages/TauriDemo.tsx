// src/services/api.ts
import { invoke } from '@tauri-apps/api/core';

//  hello world using invoke
export async function helloWorld() {
    return await invoke("greet", { name: "Khalil" });
}

// A component to demonstrate Tauri functionality
import React, { useState, useEffect } from 'react';
const TauriDemo: React.FC = () => {
    const [message, setMessage] = useState<string>('');

    useEffect(() => {
        const fetchMessage = async () => {
            try {
                const response = await helloWorld();
                setMessage(response as string);
            } catch (error) {
                console.error('Error fetching message:', error);
                setMessage('Failed to fetch message from Tauri backend.');
            }
        };

        fetchMessage();
    }, []);

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Tauri Demo</h1>
            <p>{message}</p>
        </div>
    );
};

export default TauriDemo;