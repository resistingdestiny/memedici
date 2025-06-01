"""
FastAPI routes for vlayer content authenticity verification.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import logging

from vlayer_verification import vlayer_client, verify_agent_content
from agent_config import agent_registry

logger = logging.getLogger('VlayerRoutes')

router = APIRouter(prefix="/api/vlayer", tags=["vlayer"])

class VerificationRequest(BaseModel):
    proof_id: str

class AgentProofsRequest(BaseModel):
    agent_id: str
    limit: Optional[int] = 50

@router.get("/status")
async def get_vlayer_status() -> Dict[str, Any]:
    """Get vlayer verification system status."""
    
    try:
        is_configured = vlayer_client.is_configured()
        stats = vlayer_client.get_verification_stats()
        
        return {
            "vlayer_configured": is_configured,
            "notary_endpoint": vlayer_client.notary_endpoint,
            "contract_configured": bool(vlayer_client.contract_address),
            "verification_stats": stats,
            "status": "operational" if is_configured else "configuration_needed"
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting vlayer status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get vlayer status: {str(e)}")

@router.post("/verify")
async def verify_content_proof(request: VerificationRequest) -> Dict[str, Any]:
    """Verify a specific content authenticity proof."""
    
    try:
        verification_result = verify_agent_content(request.proof_id)
        
        if verification_result.get("error"):
            return {
                "success": False,
                "proof_id": request.proof_id,
                "error": verification_result["error"],
                "verified": False
            }
        
        return {
            "success": True,
            "proof_id": request.proof_id,
            "verified": verification_result["verified"],
            "verification_details": verification_result.get("checks", {}),
            "verification_timestamp": verification_result.get("timestamp")
        }
        
    except Exception as e:
        logger.error(f"❌ Error verifying proof {request.proof_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@router.get("/agent/{agent_id}/proofs")
async def get_agent_proofs(agent_id: str, limit: int = Query(50, ge=1, le=100)) -> Dict[str, Any]:
    """Get all content authenticity proofs for a specific agent."""
    
    try:
        # Verify agent exists
        if agent_id not in agent_registry.list_agents():
            raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
        
        proofs = vlayer_client.get_agent_proofs(agent_id, limit)
        
        proof_summaries = []
        for proof in proofs:
            proof_summaries.append({
                "session_id": proof.session_id,
                "prompt": proof.prompt[:100] + "..." if len(proof.prompt) > 100 else proof.prompt,
                "model_name": proof.model_name,
                "generation_type": proof.generation_type,
                "timestamp": proof.timestamp,
                "verified": proof.verified,
                "verification_timestamp": proof.verification_timestamp,
                "api_endpoint": proof.api_endpoint
            })
        
        return {
            "success": True,
            "agent_id": agent_id,
            "total_proofs": len(proof_summaries),
            "proofs": proof_summaries
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting proofs for agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get agent proofs: {str(e)}")

@router.get("/proof/{proof_id}")
async def get_proof_details(proof_id: str) -> Dict[str, Any]:
    """Get detailed information about a specific proof."""
    
    try:
        # Try to find the proof file
        from pathlib import Path
        import json
        
        proofs_dir = Path("static/vlayer_proofs")
        proof_file = proofs_dir / f"{proof_id}.json"
        
        if not proof_file.exists():
            raise HTTPException(status_code=404, detail=f"Proof {proof_id} not found")
        
        with open(proof_file, 'r') as f:
            proof_data = json.load(f)
        
        # Remove sensitive data
        sanitized_proof = proof_data.copy()
        if 'request_headers' in sanitized_proof:
            sanitized_proof['request_headers'] = {"Content-Type": "application/json", "Authorization": "[REDACTED]"}
        
        return {
            "success": True,
            "proof_id": proof_id,
            "proof_details": sanitized_proof
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting proof details for {proof_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get proof details: {str(e)}")

@router.get("/stats/overview")
async def get_verification_overview() -> Dict[str, Any]:
    """Get comprehensive overview of vlayer verification statistics."""
    
    try:
        stats = vlayer_client.get_verification_stats()
        
        # Get additional MemeDici-specific stats
        agents = agent_registry.list_agents()
        agents_with_verified_content = 0
        
        for agent_id in agents:
            proofs = vlayer_client.get_agent_proofs(agent_id, 1)
            if proofs and any(p.verified for p in proofs):
                agents_with_verified_content += 1
        
        return {
            "success": True,
            "verification_overview": {
                "total_proofs": stats["total_proofs"],
                "verified_proofs": stats["verified_proofs"],
                "verification_rate": f"{stats['verification_rate']*100:.1f}%",
                "agents_with_proofs": stats["agents_with_proofs"],
                "agents_with_verified_content": agents_with_verified_content,
                "total_agents": len(agents)
            },
            "security_status": {
                "vlayer_configured": vlayer_client.is_configured(),
                "content_authenticity": "enabled" if vlayer_client.is_configured() else "disabled",
                "fraud_protection": "active" if stats["verification_rate"] > 0.8 else "needs_attention"
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting verification overview: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get verification overview: {str(e)}")

@router.post("/batch-verify")
async def batch_verify_proofs(proof_ids: List[str]) -> Dict[str, Any]:
    """Verify multiple proofs in batch."""
    
    if len(proof_ids) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 proofs per batch")
    
    try:
        verification_results = []
        
        for proof_id in proof_ids:
            try:
                result = verify_agent_content(proof_id)
                verification_results.append({
                    "proof_id": proof_id,
                    "verified": result.get("verified", False),
                    "error": result.get("error"),
                    "checks": result.get("checks", {})
                })
            except Exception as e:
                verification_results.append({
                    "proof_id": proof_id,
                    "verified": False,
                    "error": str(e),
                    "checks": {}
                })
        
        verified_count = sum(1 for r in verification_results if r["verified"])
        
        return {
            "success": True,
            "total_proofs": len(proof_ids),
            "verified_proofs": verified_count,
            "verification_rate": verified_count / len(proof_ids) if proof_ids else 0,
            "results": verification_results
        }
        
    except Exception as e:
        logger.error(f"❌ Error in batch verification: {e}")
        raise HTTPException(status_code=500, detail=f"Batch verification failed: {str(e)}") 