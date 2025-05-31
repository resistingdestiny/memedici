import requests
from typing import List, Union, Dict, Any
from langchain_core.tools import tool
import logging
import json
import hashlib
from datetime import datetime
import os
import base64
from custom_tool_manager import CustomToolManager
from novita_client import NovitaClient, Samplers
from novita_client.utils import base64_to_image

# Configure tool logging
logger = logging.getLogger('AgentTools')


@tool
def generate_image(prompt: str, model_name: str = "AnythingV5_v5PrtRE.safetensors", width: int = 512, height: int = 512, image_num: int = 1, steps: int = 20, guidance_scale: float = 7.5, negative_prompt: str = "", sampler_name: str = "DPM++ 2S a Karras") -> Dict[str, Any]:
    """Generate an image using Novita AI's text-to-image API.
    
    Args:
        prompt: Text description of the image to generate
        model_name: AI model to use for generation (default: AnythingV5_v5PrtRE.safetensors)
        width: Image width in pixels (default: 512)
        height: Image height in pixels (default: 512)
        image_num: Number of images to generate (default: 1)
        steps: Number of denoising steps (default: 20)
        guidance_scale: How closely to follow the prompt (default: 7.5)
        negative_prompt: What to avoid in the image (default: "")
        sampler_name: Sampling method (default: "DPM++ 2S a Karras")
        
    Returns:
        Dictionary with generation details and image data
    """
    logger.info(f"🖼️ generate_image called: {prompt[:50]}...")
    
    # Get API key from environment
    api_key = os.getenv("NOVITA_API_KEY")
    if not api_key:
        logger.error("❌ NOVITA_API_KEY not found in environment variables")
        return {
            "error": "NOVITA_API_KEY not configured. Please set your Novita AI API key.",
            "status": "error"
        }
    
    try:
        # Initialize Novita client
        client = NovitaClient(api_key)
        
        # Generate image using novita_client directly
        res = client.txt2img_v3(
            model_name=model_name,
            prompt=prompt,
            width=width,
            height=height,
            image_num=image_num,
            guidance_scale=guidance_scale,
            seed=-1,
            steps=steps,
            sampler_name=sampler_name,
            negative_prompt=negative_prompt
        )
        
        # Process results
        images_data = []
        for i, encoded_image in enumerate(res.images_encoded):
            # Convert base64 to image and save locally
            image_id = hashlib.md5(f"{prompt}_{i}_{datetime.utcnow().isoformat()}".encode()).hexdigest()[:8]
            image_filename = f"generated_image_{image_id}.png"
            image_path = os.path.join("static", image_filename)
            
            # Ensure static directory exists
            os.makedirs("static", exist_ok=True)
            
            # Save image
            base64_to_image(encoded_image).save(image_path)
            
            images_data.append({
                "id": image_id,
                "filename": image_filename,
                "path": image_path,
                "url": f"/static/{image_filename}",
                "base64": encoded_image
            })
        
        generation_result = {
            "id": hashlib.md5(f"{prompt}_{datetime.utcnow().isoformat()}".encode()).hexdigest()[:8],
            "prompt": prompt,
            "model_name": model_name,
            "status": "completed",
            "parameters": {
                "width": width,
                "height": height,
                "image_num": image_num,
                "steps": steps,
                "guidance_scale": guidance_scale,
                "negative_prompt": negative_prompt,
                "sampler_name": sampler_name
            },
            "images": images_data,
            "message": f"Successfully generated {len(images_data)} image(s)",
            "created_at": datetime.utcnow().isoformat()
        }
        
        logger.info(f"🖼️ Image generation completed: {len(images_data)} images")
        return generation_result
        
    except Exception as e:
        logger.error(f"❌ Image generation error: {str(e)}")
        return {
            "error": f"Image generation failed: {str(e)}",
            "status": "error"
        }


@tool
def generate_video(prompt: str, model_name: str = "darkSushiMixMix_225D_64380.safetensors", width: int = 640, height: int = 480, frames: int = 16, steps: int = 20, guidance_scale: float = 7.5, negative_prompt: str = "") -> Dict[str, Any]:
    """Generate a video using Novita AI's text-to-video API.
    
    Args:
        prompt: Text description of the video to generate
        model_name: AI model to use for video generation (default: darkSushiMixMix_225D_64380.safetensors)
        width: Video width in pixels (default: 640)
        height: Video height in pixels (default: 480)
        frames: Number of frames to generate (default: 16)
        steps: Number of denoising steps (default: 20)
        guidance_scale: How closely to follow the prompt (default: 7.5)
        negative_prompt: What to avoid in the video (default: "")
        
    Returns:
        Dictionary with generation details and video data
    """
    logger.info(f"🎬 generate_video called: {prompt[:50]}...")
    
    # Get API key from environment
    api_key = os.getenv("NOVITA_API_KEY")
    if not api_key:
        logger.error("❌ NOVITA_API_KEY not found in environment variables")
        return {
            "error": "NOVITA_API_KEY not configured. Please set your Novita AI API key.",
            "status": "error"
        }
    
    try:
        # Initialize Novita client
        client = NovitaClient(api_key)
        
        # Generate video
        res = client.txt2video(
            model_name=model_name,
            width=width,
            height=height,
            guidance_scale=guidance_scale,
            steps=steps,
            seed=-1,
            prompts=[{"prompt": prompt, "frames": frames}],
            negative_prompt=negative_prompt
        )
        
        # Process results
        videos_data = []
        for i, video_bytes in enumerate(res.video_bytes):
            # Save video locally
            video_id = hashlib.md5(f"{prompt}_{i}_{datetime.utcnow().isoformat()}".encode()).hexdigest()[:8]
            video_filename = f"generated_video_{video_id}.mp4"
            video_path = os.path.join("static", video_filename)
            
            # Ensure static directory exists
            os.makedirs("static", exist_ok=True)
            
            # Save video
            with open(video_path, "wb") as f:
                f.write(video_bytes)
            
            videos_data.append({
                "id": video_id,
                "filename": video_filename,
                "path": video_path,
                "url": f"/static/{video_filename}",
                "size_bytes": len(video_bytes)
            })
        
        generation_result = {
            "id": hashlib.md5(f"{prompt}_{datetime.utcnow().isoformat()}".encode()).hexdigest()[:8],
            "prompt": prompt,
            "model_name": model_name,
            "status": "completed",
            "parameters": {
                "width": width,
                "height": height,
                "frames": frames,
                "steps": steps,
                "guidance_scale": guidance_scale,
                "negative_prompt": negative_prompt
            },
            "videos": videos_data,
            "message": f"Successfully generated {len(videos_data)} video(s)",
            "created_at": datetime.utcnow().isoformat()
        }
        
        logger.info(f"🎬 Video generation completed: {len(videos_data)} videos")
        return generation_result
        
    except Exception as e:
        logger.error(f"❌ Video generation error: {str(e)}")
        return {
            "error": f"Video generation failed: {str(e)}",
            "status": "error"
        }


@tool
def list_available_models(model_type: str = "image") -> Dict[str, Any]:
    """List available models for image or video generation.
    
    Args:
        model_type: Type of models to list ("image" or "video")
        
    Returns:
        Dictionary with available models and their capabilities
    """
    logger.info(f"📋 list_available_models called: {model_type}")
    
    # Get API key from environment
    api_key = os.getenv("NOVITA_API_KEY")
    if not api_key:
        logger.error("❌ NOVITA_API_KEY not found in environment variables")
        return {
            "error": "NOVITA_API_KEY not configured. Please set your Novita AI API key.",
            "status": "error"
        }
    
    try:
        # Initialize Novita client
        client = NovitaClient(api_key)
        
        if model_type.lower() == "image":
            # Get available image models
            models = client.models()
            image_models = [
                {
                    "name": model.name,
                    "sd_name": model.sd_name,
                    "type": model.type,
                    "visibility": model.visibility
                }
                for model in models.data if model.type in ["txt2img", "img2img"]
            ]
            
            result = {
                "model_type": "image",
                "models": image_models,
                "total_count": len(image_models),
                "popular_models": [
                    "AnythingV5_v5PrtRE.safetensors",
                    "protovisionXLHighFidelity3D_release0630Bakedvae.safetensors",
                    "dreamshaper_8.safetensors"
                ],
                "status": "success"
            }
        elif model_type.lower() == "video":
            # For video models, provide known working models
            video_models = [
                {
                    "name": "darkSushiMixMix_225D_64380.safetensors",
                    "description": "High-quality video generation model",
                    "type": "txt2video"
                },
                {
                    "name": "stable-video-diffusion-img2vid-xt",
                    "description": "Stable Video Diffusion model for image-to-video",
                    "type": "img2video"
                }
            ]
            
            result = {
                "model_type": "video",
                "models": video_models,
                "total_count": len(video_models),
                "status": "success"
            }
        else:
            result = {
                "error": f"Unknown model type: {model_type}. Use 'image' or 'video'",
                "status": "error"
            }
        
        logger.info(f"📋 Listed {result.get('total_count', 0)} {model_type} models")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error listing models: {str(e)}")
        return {
            "error": f"Failed to list models: {str(e)}",
            "status": "error"
        }


# Global custom tool manager
custom_tool_manager = CustomToolManager()


def get_available_tools():
    """Get all available tools as LangChain Tool objects.
    
    Returns:
        List of Tool objects ready for use with LangChain agents
    """
    tools = [generate_image, generate_video, list_available_models]
    logger.info(f"🔧 Available tools: {[t.name for t in tools]}")
    return tools


def get_tool_by_name(tool_name: str):
    """Get a specific tool by name."""
    tool_map = {
        "generate_image": generate_image,
        "generate_video": generate_video,
        "list_available_models": list_available_models,
    }
    return tool_map.get(tool_name)


def get_tools_by_names(tool_names: List[str]):
    """Get multiple tools by their names."""
    tools = []
    for name in tool_names:
        tool = get_tool_by_name(name)
        if tool:
            tools.append(tool)
    return tools 