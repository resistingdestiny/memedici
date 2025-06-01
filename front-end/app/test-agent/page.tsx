"use client";

import { useState } from "react";
import { httpClient } from "@/lib/http";

export default function TestAgentPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testAgentId = "0c99f977-c501-4071-9c52-fc69b3c9a9bd";

  const testApiCall = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log("Testing API call to:", `/agents/${testAgentId}`);
      const response = await httpClient.get(`/agents/${testAgentId}`);
      console.log("API Response:", response);
      setResult(response.data);
    } catch (err: any) {
      console.error("API Error:", err);
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-2xl font-bold mb-6">Agent API Test</h1>
      
      <div className="space-y-4">
        <div>
          <p><strong>Testing Agent ID:</strong> {testAgentId}</p>
          <button 
            onClick={testApiCall}
            disabled={loading}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "Testing..." : "Test API Call"}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="p-4 bg-green-100 text-green-700 rounded">
            <strong>Success!</strong>
            <pre className="mt-2 text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
} 