from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import logging
from sqlalchemy import func
from datetime import datetime, timedelta

from agent_config import agent_registry, GeneratedArtworkDB, SessionLocal

logger = logging.getLogger('ArtworkRoutes')

router = APIRouter(prefix="/artworks", tags=["Artworks"])

@router.get("/{artwork_id}")
async def get_artwork(artwork_id: str):
    """Get artwork information from database."""
    try:
        session = SessionLocal()
        try:
            artwork = session.query(GeneratedArtworkDB).filter(GeneratedArtworkDB.id == artwork_id).first()
            if not artwork:
                raise HTTPException(status_code=404, detail="Artwork not found")
            
            return {
                "success": True,
                "artwork": {
                    "id": artwork.id,
                    "agent_id": artwork.agent_id,
                    "artwork_type": artwork.artwork_type,
                    "prompt": artwork.prompt,
                    "negative_prompt": artwork.negative_prompt,
                    "model_name": artwork.model_name,
                    "model_type": artwork.model_type,
                    "parameters": artwork.parameters,
                    "file_url": artwork.file_url,
                    "file_size": artwork.file_size,
                    "metadata": artwork.artwork_metadata,
                    "created_at": artwork.created_at.isoformat() if artwork.created_at else None
                }
            }
        finally:
            session.close()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics")
async def get_global_artwork_statistics():
    """Get global artwork statistics across all agents."""
    try:
        session = SessionLocal()
        try:
            total_artworks = session.query(GeneratedArtworkDB).count()
            
            # Get statistics by agent
            agent_stats = session.query(
                GeneratedArtworkDB.agent_id,
                func.count(GeneratedArtworkDB.id).label('count')
            ).group_by(GeneratedArtworkDB.agent_id)\
            .order_by(func.count(GeneratedArtworkDB.id).desc())\
            .all()
            
            # Get statistics by model type
            model_stats = session.query(
                GeneratedArtworkDB.model_type,
                func.count(GeneratedArtworkDB.id).label('count')
            ).group_by(GeneratedArtworkDB.model_type)\
            .order_by(func.count(GeneratedArtworkDB.id).desc())\
            .all()
            
            # Recent activity
            now = datetime.utcnow()
            week_ago = now - timedelta(days=7)
            month_ago = now - timedelta(days=30)
            
            recent_stats = {
                "last_7_days": session.query(GeneratedArtworkDB)\
                    .filter(GeneratedArtworkDB.created_at >= week_ago).count(),
                "last_30_days": session.query(GeneratedArtworkDB)\
                    .filter(GeneratedArtworkDB.created_at >= month_ago).count()
            }
            
            return {
                "success": True,
                "total_artworks": total_artworks,
                "by_agent": [{"agent_id": agent_id, "count": count} for agent_id, count in agent_stats],
                "by_model_type": [{"model_type": model_type, "count": count} for model_type, count in model_stats],
                "recent_activity": recent_stats,
                "generated_at": datetime.utcnow().isoformat()
            }
        finally:
            session.close()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving statistics: {str(e)}")

@router.get("/agents/{agent_id}")
async def list_agent_artworks(agent_id: str, limit: int = 20, offset: int = 0, include_details: bool = False):
    """List artworks created by a specific agent with enhanced details."""
    try:
        session = SessionLocal()
        try:
            # Get agent info
            agent_info = agent_registry.get_agent_info(agent_id)
            
            artworks = session.query(GeneratedArtworkDB)\
                .filter(GeneratedArtworkDB.agent_id == agent_id)\
                .order_by(GeneratedArtworkDB.created_at.desc())\
                .offset(offset)\
                .limit(limit)\
                .all()
            
            total_count = session.query(GeneratedArtworkDB)\
                .filter(GeneratedArtworkDB.agent_id == agent_id)\
                .count()
            
            artwork_list = []
            for artwork in artworks:
                artwork_data = {
                    "id": artwork.id,
                    "artwork_type": artwork.artwork_type,
                    "prompt": artwork.prompt[:100] + "..." if len(artwork.prompt) > 100 else artwork.prompt,
                    "model_name": artwork.model_name,
                    "model_type": artwork.model_type,
                    "file_url": artwork.file_url,
                    "file_size": artwork.file_size,
                    "created_at": artwork.created_at.isoformat() if artwork.created_at else None
                }
                
                # Include full details if requested
                if include_details:
                    artwork_data.update({
                        "full_prompt": artwork.prompt,
                        "negative_prompt": artwork.negative_prompt,
                        "parameters": artwork.parameters,
                        "metadata": artwork.artwork_metadata,
                        "file_path": artwork.file_path
                    })
                
                artwork_list.append(artwork_data)
            
            # Get artwork statistics
            stats = {
                "total_artworks": total_count,
                "by_model_type": {},
                "recent_activity": {
                    "last_7_days": 0,
                    "last_30_days": 0
                }
            }
            
            # Calculate model type distribution
            model_stats = session.query(
                GeneratedArtworkDB.model_type,
                func.count(GeneratedArtworkDB.id).label('count')
            ).filter(GeneratedArtworkDB.agent_id == agent_id)\
            .group_by(GeneratedArtworkDB.model_type)\
            .all()
            
            for model_type, count in model_stats:
                stats["by_model_type"][model_type] = count
            
            # Calculate recent activity
            now = datetime.utcnow()
            week_ago = now - timedelta(days=7)
            month_ago = now - timedelta(days=30)
            
            stats["recent_activity"]["last_7_days"] = session.query(GeneratedArtworkDB)\
                .filter(GeneratedArtworkDB.agent_id == agent_id, GeneratedArtworkDB.created_at >= week_ago)\
                .count()
            
            stats["recent_activity"]["last_30_days"] = session.query(GeneratedArtworkDB)\
                .filter(GeneratedArtworkDB.agent_id == agent_id, GeneratedArtworkDB.created_at >= month_ago)\
                .count()
            
            return {
                "success": True,
                "agent": {
                    "id": agent_id,
                    "display_name": agent_info.get("identity", {}).get("display_name", "Unknown Agent"),
                    "studio_name": agent_info.get("studio", {}).get("name", "Unknown Studio"),
                    "art_style": agent_info.get("studio", {}).get("art_style", "Unknown Style")
                },
                "artworks": artwork_list,
                "statistics": stats,
                "pagination": {
                    "limit": limit,
                    "offset": offset,
                    "has_more": total_count > offset + limit,
                    "total_pages": (total_count + limit - 1) // limit
                }
            }
        finally:
            session.close()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving artworks: {str(e)}")

@router.get("/agents/{agent_id}/recent")
async def get_agent_recent_artworks(agent_id: str, days: int = 7):
    """Get recent artworks created by a specific agent."""
    try:
        session = SessionLocal()
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            recent_artworks = session.query(GeneratedArtworkDB)\
                .filter(
                    GeneratedArtworkDB.agent_id == agent_id,
                    GeneratedArtworkDB.created_at >= cutoff_date
                )\
                .order_by(GeneratedArtworkDB.created_at.desc())\
                .all()
            
            artwork_list = []
            for artwork in recent_artworks:
                artwork_list.append({
                    "id": artwork.id,
                    "prompt": artwork.prompt[:50] + "..." if len(artwork.prompt) > 50 else artwork.prompt,
                    "model_type": artwork.model_type,
                    "file_url": artwork.file_url,
                    "created_at": artwork.created_at.isoformat() if artwork.created_at else None
                })
            
            return {
                "success": True,
                "agent_id": agent_id,
                "period_days": days,
                "recent_artworks": artwork_list,
                "count": len(artwork_list)
            }
        finally:
            session.close()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving recent artworks: {str(e)}")

@router.get("/")
async def list_all_artworks(limit: int = 20, offset: int = 0, include_details: bool = False):
    """List all artworks across all agents with pagination."""
    try:
        session = SessionLocal()
        try:
            artworks = session.query(GeneratedArtworkDB)\
                .order_by(GeneratedArtworkDB.created_at.desc())\
                .offset(offset)\
                .limit(limit)\
                .all()
            
            total_count = session.query(GeneratedArtworkDB).count()
            
            artwork_list = []
            for artwork in artworks:
                # Get agent info for each artwork
                try:
                    agent_info = agent_registry.get_agent_info(artwork.agent_id)
                except:
                    agent_info = {}
                
                artwork_data = {
                    "id": artwork.id,
                    "agent_id": artwork.agent_id,
                    "agent_name": agent_info.get("identity", {}).get("display_name", artwork.agent_id),
                    "artwork_type": artwork.artwork_type,
                    "prompt": artwork.prompt[:100] + "..." if len(artwork.prompt) > 100 else artwork.prompt,
                    "model_name": artwork.model_name,
                    "model_type": artwork.model_type,
                    "file_url": artwork.file_url,
                    "file_size": artwork.file_size,
                    "created_at": artwork.created_at.isoformat() if artwork.created_at else None
                }
                
                # Include full details if requested
                if include_details:
                    artwork_data.update({
                        "full_prompt": artwork.prompt,
                        "negative_prompt": artwork.negative_prompt,
                        "parameters": artwork.parameters,
                        "metadata": artwork.artwork_metadata,
                        "file_path": artwork.file_path,
                        "agent_info": {
                            "display_name": agent_info.get("identity", {}).get("display_name", artwork.agent_id),
                            "studio_name": agent_info.get("studio", {}).get("name", "Unknown Studio"),
                            "art_style": agent_info.get("studio", {}).get("art_style", "Unknown Style"),
                            "avatar_url": agent_info.get("identity", {}).get("avatar_url", None)
                        }
                    })
                
                artwork_list.append(artwork_data)
            
            return {
                "success": True,
                "artworks": artwork_list,
                "pagination": {
                    "limit": limit,
                    "offset": offset,
                    "has_more": total_count > offset + limit,
                    "total_pages": (total_count + limit - 1) // limit,
                    "total_count": total_count
                }
            }
        finally:
            session.close()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving artworks: {str(e)}") 