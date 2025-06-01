import requests
from typing import List, Union, Dict, Any, Optional
from langchain_core.tools import tool
import logging
import json
import hashlib
from datetime import datetime
import os
import base64
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from custom_tool_manager import CustomToolManager
from novita_client import NovitaClient, Samplers, ModelType
from novita_client.utils import base64_to_image
from agent_config import Base, GeneratedArtworkDB, SessionLocal, AgentDB
from image_models import (
    ImageModelRegistry, 
    ImageModelCategory, 
    select_model_for_agent, 
    get_available_models,
    VideoModelRegistry,
    VideoModelCategory,
    get_available_video_models
)
import uuid
import time
from pathlib import Path
from openai import OpenAI
from enum import Enum
# from vlayer_verification import create_content_proof, VlayerWebProof

class ImageSize(Enum):
    """Supported image sizes."""
    SQUARE = "1024x1024"
    LANDSCAPE = "1536x1024" 
    PORTRAIT = "1024x1536"

class ImageQuality(Enum):
    """Supported image quality levels."""
    AUTO = "auto"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

# Configure tool logging
logger = logging.getLogger('AgentTools')

# Database setup for artwork storage
engine = create_engine("sqlite:///agents.db")
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def generate_full_url(filename: str, base_url: str = "https://memedici-backend.onrender.com") -> str:
    """Generate a full URL for a static file."""
    return f"{get_base_url()}/static/artworks/{filename}"

def get_base_url() -> str:
    """Get the base URL for the server. Defaults to production URL."""
    # Default to production URL, can be overridden with environment variable for local development
    return os.getenv("BASE_URL", "https://memedici-backend.onrender.com")

@tool
def generate_image(
    prompt: str,
    model: ImageModelCategory = ImageModelCategory.REALISTIC,
    width: int = 512,
    height: int = 512,
    steps: int = 20,
    guidance_scale: float = 7.5,
    negative_prompt: str = "",
    seed: Optional[int] = None,
    agent_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate a single high-quality image using Novita AI with specific model selection.
    
    ⚡ AGENT AUTO-INJECTION: agent_id is automatically provided by the agent system.
    You do NOT need to specify agent_id when calling this tool - it's handled internally.
    
    USAGE: from image_models import ImageModelCategory
    Then call: generate_image(prompt="your prompt", model=ImageModelCategory.REALISTIC)
    
    🎨 REQUIRED IMPORT:
    You MUST import ImageModelCategory to use this tool:
    ```python
    from image_models import ImageModelCategory
    ```
    
    🎯 AVAILABLE MODEL CATEGORIES (use these exact enum values):
    
    • ImageModelCategory.REALISTIC
      Model: Anything V5 (AnythingV5_v5PrtRE.safetensors)
      Type: Checkpoint (Stable Diffusion 1.5)
      Best for: Photorealistic images, portraits, landscapes, realistic scenes
      Prompt style: Include lighting details, camera angles, quality descriptors
      Example: "portrait of a woman, professional lighting, 4k, detailed"
      
    • ImageModelCategory.ANIMATION  
      Model: Fustercluck V2 (fustercluck_v2_233009.safetensors)
      Type: Checkpoint (Stable Diffusion 1.5)
      Best for: Cartoon characters, animated scenes, stylized art, vibrant imagery
      Prompt style: Describe character features, art style, color scheme
      Example: "cartoon character, anime style, bright colors, expressive eyes"
      
    • ImageModelCategory.DREAMY
      Model: DreamShaper V8
      Type: Checkpoint (Stable Diffusion 1.5)
      Best for: Dreamy landscapes, ethereal portraits, fantasy art, atmospheric scenes
      Prompt style: Soft descriptions, ethereal qualities, fantasy elements
      Example: "ethereal portrait, soft lighting, fantasy atmosphere, dreamy landscape"
      
    • ImageModelCategory.ARTISTIC
      Model: Line Art Style LoRA XL
      Type: LoRA (Stable Diffusion XL 1.0)  
      Best for: Line drawings, artistic illustrations, clean art, minimalist designs
      Prompt style: Focus on line quality, artistic techniques, composition
      Example: "line art, clean illustration, minimalist design, artistic"
    
    🚨 CRITICAL PROMPT CRAFTING RULES:
    1. YOU must write detailed, descriptive prompts yourself
    2. For LoRA models (ARTISTIC): Be specific about style and composition
    3. For REALISTIC: Include lighting, camera angle, quality descriptors like "4k", "detailed"
    4. For ANIMATION: Describe character features, art style, color scheme clearly
    5. For DREAMY: Focus on ethereal qualities, soft lighting, fantasy elements
    6. Always use the model parameter with ImageModelCategory enum values
    
    📝 EXAMPLE USAGE:
    ```python
    # Import the enum first
    from image_models import ImageModelCategory
    
    # Generate realistic image (agent_id automatically provided)
    result = generate_image(
        prompt="portrait of a scientist, professional lighting, 4k, detailed",
        model=ImageModelCategory.REALISTIC
    )
    
    # Generate dreamy image (new prompt style)
    result = generate_image(
        prompt="ethereal portrait, soft lighting, fantasy atmosphere, dreamy landscape",
        model=ImageModelCategory.DREAMY
    )
    ```
    
    📋 PARAMETERS:
    - prompt (str, REQUIRED): YOUR detailed description of the image to generate
    - model (ImageModelCategory, default=REALISTIC): Enum value for model selection
    - width (int, default=512): Image width in pixels (512, 768, 1024 recommended)
    - height (int, default=512): Image height in pixels (512, 768, 1024 recommended)
    - steps (int, default=20): Generation steps (10-50 range, higher = more detail)
    - guidance_scale (float, default=7.5): Prompt adherence (1-20, higher = stricter)
    - negative_prompt (str, default=""): What to avoid in the image
    - seed (int, optional): Random seed for reproducible results (None = random)
    - agent_id (str, auto-injected): Your agent ID - automatically provided by system
        
    📤 RETURNS:
    Dict containing:
    - success (bool): Whether generation succeeded
    - artwork_id (str): Unique identifier for the generated artwork
    - file_path (str): Local file system path to the saved image
    - file_url (str): Web URL to access the image
    - file_size (int): File size in bytes
    - model_used (dict): Information about the AI model used
    - generation_info (dict): All generation parameters and settings
    - message (str): Success message with details
    - db_artwork_id (str, if agent_id provided): Database record ID
    
    🔧 TECHNICAL NOTES:
    - Images are saved to static/artworks/ directory
    - Database storage automatic when agent_id provided
    - Supports PNG format output
    - Uses DPM++ 2S a Karras sampler for high quality
    - Agent artwork count automatically updated in database
    """
    try:
        api_key = os.getenv('NOVITA_API_KEY')
        if not api_key:
            return {"success": False, "error": "NOVITA_API_KEY not found"}
        
        # Ensure agent_id is provided by the agent system
        if not agent_id:
            logger.warning("⚠️  generate_image called without agent_id - database tracking disabled")
            print("⚠️  WARNING: generate_image called without agent_id. Artwork will not be tracked in database.")
        
        # Get model info from the enum
        model_info = ImageModelRegistry.get_model_info(model)
        selected_model = model_info.model_name
        
        # Initialize Novita client
        client = NovitaClient(api_key)
        
        # Generate unique filename
        artwork_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"artwork_{timestamp}_{artwork_id[:8]}.png"
        
        # Ensure static directory exists
        static_dir = Path("static/artworks")
        static_dir.mkdir(parents=True, exist_ok=True)
        file_path = static_dir / filename
        
        print(f"🎨 Generating image with {model_info.display_name}")
        print(f"📝 Prompt: {prompt}")
        
        # Generate single image
        res = client.txt2img_v3(
            model_name=selected_model,
            prompt=prompt,
            width=width,
            height=height,
            image_num=1,  # Always generate exactly 1 image
            guidance_scale=guidance_scale,
            seed=seed or -1,
            steps=steps,
            sampler_name="DPM++ 2S a Karras",
            negative_prompt=negative_prompt
        )
        
        if not res.images_encoded:
            return {"success": False, "error": "No images generated by the API"}
        
        # Process the single generated image
        encoded_image = res.images_encoded[0]
        
        # Save image to file system
        image = base64_to_image(encoded_image)
        image.save(file_path)
        
        file_size = file_path.stat().st_size
        file_url = generate_full_url(filename)
        
        # Store in database if agent_id provided
        db_artwork_id = None
        if agent_id:
            db_artwork_id = store_artwork_in_db(
                agent_id=agent_id,
                artwork_id=artwork_id,
                prompt=prompt,
                negative_prompt=negative_prompt,
                model_name=selected_model,
                model_type=model.value,
                parameters={
                    "width": width,
                    "height": height,
                    "steps": steps,
                    "guidance_scale": guidance_scale,
                    "seed": seed or -1
                },
                file_path=str(file_path),
                file_url=file_url,
                file_size=file_size,
                vlayer_proof_id=proof.session_id if proof else None
            )
        
        return {
            "success": True,
            "artwork_id": artwork_id,
            "db_artwork_id": db_artwork_id,
            "file_path": str(file_path),
            "file_url": file_url,
            "file_size": file_size,
            "model_used": {
                "name": selected_model,
                "display_name": model_info.display_name,
                "category": model.value,
                "type": model_info.model_type,
                "base_model": model_info.base_model
            },
            "generation_info": {
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "parameters": {
                    "width": width,
                    "height": height,
                    "steps": steps,
                    "guidance_scale": guidance_scale,
                    "seed": seed or -1
                }
            },
            "message": f"✨ Image generated successfully using {model_info.display_name}! Database URL: /api/artworks/{db_artwork_id}",
            "proof": proof
        }
        
    except Exception as e:
        print(f"❌ Error in generate_image: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": f"Generation failed: {str(e)}"}

@tool
def generate_video(
    prompt: str,
    model: VideoModelCategory = VideoModelCategory.REALISTIC,
    width: int = 640,
    height: int = 480,
    frames: int = 16,
    negative_prompt: str = "",
    seed: Optional[int] = None,
    agent_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate a high-quality video using Novita AI with specific model selection.
    
    ⚡ AGENT AUTO-INJECTION: agent_id is automatically provided by the agent system.
    You do NOT need to specify agent_id when calling this tool - it's handled internally.
    
    USAGE: from image_models import VideoModelCategory
    Then call: generate_video(prompt="your prompt", model=VideoModelCategory.REALISTIC)
    
    🎬 REQUIRED IMPORT:
    You MUST import VideoModelCategory to use this tool:
    ```python
    from image_models import VideoModelCategory
    ```
    
    🎯 AVAILABLE MODEL CATEGORIES (use these exact enum values):
    
    • VideoModelCategory.REALISTIC
      Model: Realistic Vision V5.1 (realisticVisionV51_v51VAE_94301.safetensors)
      Type: Checkpoint (Stable Diffusion 1.5)
      Best for: Photorealistic videos, portraits, nature scenes, documentary-style content
      Prompt style: Include lighting details, camera movements, realistic descriptions
      Example: "a woman walking in a park, golden hour lighting, smooth camera movement"
      
    • VideoModelCategory.ANIMATION  
      Model: DreamShaper V8 (dreamshaper_8_93211.safetensors)
      Type: Checkpoint (Stable Diffusion 1.5)
      Best for: Animated sequences, stylized videos, character animations, fantasy scenes
      Prompt style: Describe character features, animation style, vibrant movements
      Example: "animated character dancing, colorful art style, fluid motion"
      
    • VideoModelCategory.DREAMY
      Model: DarkSushi Mix (darkSushiMixMix_225D_64380.safetensors)
      Type: Checkpoint (Stable Diffusion 1.5)
      Best for: Dreamy sequences, atmospheric videos, artistic content, surreal scenes
      Prompt style: Focus on mood, atmosphere, ethereal qualities
      Example: "ethereal landscape with floating objects, dreamy atmosphere, soft movements"
      
    • VideoModelCategory.DARK
      Model: Epic Realism Natural (epicrealism_naturalSin_121250.safetensors)
      Type: Checkpoint (Stable Diffusion 1.5)
      Best for: Cinematic videos, dramatic scenes, detailed environments, moody content
      Prompt style: Emphasize drama, contrast, cinematic qualities
      Example: "dramatic storm approaching city, dark clouds, cinematic camera angle"
    
    🚨 CRITICAL PROMPT CRAFTING RULES:
    1. YOU must write detailed, descriptive prompts for video motion
    2. Describe movement, action, and camera work clearly
    3. Include scene setting and environmental details
    4. Specify timing and pacing of actions
    5. Always use the model parameter with VideoModelCategory enum values
    
    📝 EXAMPLE USAGE:
    ```python
    # Import the enum first
    from image_models import VideoModelCategory
    
    # Generate realistic video (agent_id automatically provided)
    result = generate_video(
        prompt="a cat walking through a garden, sunny day, gentle breeze, smooth motion",
        model=VideoModelCategory.REALISTIC
    )
    
    # Generate animated video
    result = generate_video(
        prompt="animated character jumping over obstacles, bright colors, energetic movement",
        model=VideoModelCategory.ANIMATION
    )
    ```
    
    📋 PARAMETERS:
    - prompt (str, REQUIRED): YOUR detailed description of the video to generate
    - model (VideoModelCategory, default=REALISTIC): Enum value for model selection
    - width (int, default=640): Video width in pixels (640, 768, 1024 recommended)
    - height (int, default=480): Video height in pixels (256-1024 range, 480, 576, 768 recommended) 
    - frames (int, default=16): Number of frames to generate (16-128 range)
    - negative_prompt (str, default=""): What to avoid in the video
    - agent_id (str, auto-injected): Your agent ID - automatically provided by system
        
    📤 RETURNS:
    Dict containing:
    - success (bool): Whether generation succeeded
    - artwork_id (str): Unique identifier for the generated video
    - file_path (str): Local file system path to the saved video
    - file_url (str): Web URL to access the video
    - file_size (int): File size in bytes
    - model_used (dict): Information about the AI model used
    - generation_info (dict): All generation parameters and settings
    - message (str): Success message with details
    - db_artwork_id (str, if agent_id provided): Database record ID
    
    🔧 TECHNICAL NOTES:
    - Videos are saved to static/artworks/ directory as MP4 files
    - Database storage automatic when agent_id provided
    - Hardcoded parameters: guidance_scale=7.5, steps=20, seed=-1
    - Height must be between 256-1024 pixels (API requirement)
    - Frames must be between 16-128 (API requirement)
    - Negative prompt must be at least 1 character (API requirement)
    - Agent artwork count automatically updated in database
    """
    try:
        api_key = os.getenv('NOVITA_API_KEY')
        if not api_key:
            return {"success": False, "error": "NOVITA_API_KEY not found"}
        
        # Ensure agent_id is provided by the agent system
        if not agent_id:
            logger.warning("⚠️  generate_video called without agent_id - database tracking disabled")
            print("⚠️  WARNING: generate_video called without agent_id. Video will not be tracked in database.")
        
        # Validate and fix parameters to meet API requirements
        if height < 256:
            height = 256
            print(f"⚠️  Height adjusted to minimum value: {height}")
        elif height > 1024:
            height = 1024
            print(f"⚠️  Height adjusted to maximum value: {height}")
        
        # API requires frames to be between 16-128
        if frames < 16:
            frames = 16
            print(f"⚠️  Frames adjusted to minimum value: {frames}")
        elif frames > 128:
            frames = 128
            print(f"⚠️  Frames adjusted to maximum value: {frames}")
        
        # API requires negative prompt to be at least 1 character
        if not negative_prompt or len(negative_prompt.strip()) == 0:
            negative_prompt = "blurry, low quality"
            print(f"⚠️  Default negative prompt applied: {negative_prompt}")
        
        # Get model info from the enum
        model_info = VideoModelRegistry.get_model_info(model)
        selected_model = model_info.model_name
        
        # Initialize Novita client
        client = NovitaClient(api_key)
        
        # Generate unique filename
        artwork_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"video_{timestamp}_{artwork_id[:8]}.mp4"
        
        # Ensure static directory exists
        static_dir = Path("static/artworks")
        static_dir.mkdir(parents=True, exist_ok=True)
        file_path = static_dir / filename
        
        print(f"🎬 Generating video with {model_info.display_name}")
        print(f"📝 Prompt: {prompt}")
        
        # Hardcoded parameters as requested
        guidance_scale = 7.5
        steps = 20
        
        if seed is None:
            seed = -1
        
        # Generate video with single prompt structure
        res = client.txt2video(
            model_name=selected_model,
            width=width,
            height=height,
            guidance_scale=guidance_scale,
            steps=steps,
            seed=seed,
            prompts=[{"prompt": prompt, "frames": frames}],
            negative_prompt=negative_prompt
        )
        
        if not res.video_bytes:
            return {"success": False, "error": "No videos generated by the API"}
        
        # Process the first generated video
        video_bytes = res.video_bytes[0]
        
        # Save video to file system
        with open(file_path, "wb") as f:
            f.write(video_bytes)
        
        file_size = len(video_bytes)
        file_url = generate_full_url(filename)
        
        # Create vlayer content authenticity proof
        proof = None
        if agent_id:
            try:
                # Prepare request and response data for proof
                request_data = {
                    "model_name": selected_model,
                    "width": width,
                    "height": height,
                    "guidance_scale": guidance_scale,
                    "steps": steps,
                    "seed": seed,
                    "prompts": [{"prompt": prompt, "frames": frames}],
                    "negative_prompt": negative_prompt
                }
                
                response_data = {
                    "success": True,
                    "video_generated": True,
                    "model_used": selected_model,
                    "artwork_id": artwork_id
                }
                
                proof = create_content_proof(
                    agent_id=agent_id,
                    api_endpoint="https://api.novita.ai/v3/async/txt2video",
                    request_data=request_data,
                    response_data=response_data,
                    prompt=prompt,
                    model_name=selected_model,
                    generation_type="video"
                )
                
                if proof:
                    print(f"🔐 Content authenticity proof created: {proof.session_id}")
                
            except Exception as e:
                print(f"⚠️  Failed to create content proof: {e}")
        
        # Store in database if agent_id provided
        db_artwork_id = None
        if agent_id:
            db_artwork_id = store_artwork_in_db(
                agent_id=agent_id,
                artwork_id=artwork_id,
                prompt=prompt,
                negative_prompt=negative_prompt,
                model_name=selected_model,
                model_type=model.value,
                parameters={
                    "width": width,
                    "height": height,
                    "frames": frames,
                    "steps": steps,
                    "guidance_scale": guidance_scale,
                    "seed": seed
                },
                file_path=str(file_path),
                file_url=file_url,
                file_size=file_size,
                artwork_type="video",
                vlayer_proof_id=proof.session_id if proof else None
            )
        
        return {
            "success": True,
            "artwork_id": artwork_id,
            "db_artwork_id": db_artwork_id,
            "file_path": str(file_path),
            "file_url": file_url,
            "file_size": file_size,
            "model_used": {
                "name": selected_model,
                "display_name": model_info.display_name,
                "category": model.value,
                "type": model_info.model_type,
                "base_model": model_info.base_model
            },
            "generation_info": {
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "parameters": {
                    "width": width,
                    "height": height,
                    "frames": frames,
                    "steps": steps,
                    "guidance_scale": guidance_scale,
                    "seed": seed
                }
            },
            "message": f"🎬 Video generated successfully using {model_info.display_name}! Database URL: /api/artworks/{db_artwork_id}" if db_artwork_id else f"🎬 Video generated successfully using {model_info.display_name}!"
        }
        
    except Exception as e:
        print(f"❌ Error in generate_video: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": f"Video generation failed: {str(e)}"}

@tool
def generate_images_advanced(
    prompt: str,
    size: ImageSize = ImageSize.SQUARE,
    quality: ImageQuality = ImageQuality.AUTO,
    agent_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate premium high-quality images using advanced GPT Image model.
    
    ⚡ AGENT AUTO-INJECTION: agent_id is automatically provided by the agent system.
    You do NOT need to specify agent_id when calling this tool - it's handled internally.
    
    🎨 PREMIUM IMAGE GENERATION:
    This tool uses advanced GPT Image model for creating exceptionally high-quality,
    detailed, and creative images. Perfect for professional artwork, marketing materials,
    creative projects, and any scenario requiring top-tier image quality.
    
    ✨ KEY ADVANTAGES:
    • Superior image quality and detail compared to standard models
    • Better understanding of complex prompts and creative concepts
    • Enhanced coherence in generated imagery
    • Professional-grade output suitable for commercial use
    • Advanced prompt interpretation and artistic creativity
    • Consistent style and composition throughout generations
    
    🎯 OPTIMAL USE CASES:
    • Professional artwork and illustrations
    • Marketing and advertising visuals
    • Creative concept art and design
    • High-resolution social media content
    • Product mockups and presentations
    • Editorial and journalistic imagery
    • Fine art and artistic expressions
    • Brand identity and logo concepts
    
    🎯 REQUIRED IMPORTS:
    You MUST import the enums to use this tool:
    ```python
    from agent_tools import ImageSize, ImageQuality
    ```
    
    📋 PARAMETERS:
    - prompt (str, REQUIRED): YOUR detailed, creative description of the image to generate.
      The more descriptive and specific, the better the results. GPT Image excels at
      understanding complex, nuanced prompts with artistic direction.
      
    - size (ImageSize, default=ImageSize.SQUARE): Image dimensions. Available options:
      * ImageSize.SQUARE - 1024x1024, ideal for social media, avatars, general use
      * ImageSize.LANDSCAPE - 1536x1024, perfect for banners, headers, wide scenes  
      * ImageSize.PORTRAIT - 1024x1536, excellent for posters, mobile content, tall compositions
      
    - quality (ImageQuality, default=ImageQuality.AUTO): Image generation quality level:
      * ImageQuality.AUTO - Automatically selects best quality for the model (recommended)
      * ImageQuality.HIGH - Maximum quality and detail, highest cost
      * ImageQuality.MEDIUM - Balanced quality and performance
      * ImageQuality.LOW - Faster generation, lower cost, reduced detail
      
    - agent_id (str, auto-injected): Your agent ID - automatically provided by system
    
    🚨 PROMPT CRAFTING BEST PRACTICES:
    1. Be specific and detailed in your descriptions
    2. Include artistic style references (e.g., "in the style of impressionist painting")
    3. Specify lighting conditions (e.g., "golden hour lighting", "studio lighting")
    4. Mention composition details (e.g., "close-up portrait", "wide landscape shot")
    5. Add quality descriptors (e.g., "highly detailed", "photorealistic", "8K resolution")
    6. Include mood and atmosphere (e.g., "mysterious atmosphere", "cheerful mood")
    7. Specify color schemes when relevant (e.g., "warm color palette", "monochromatic blue")
    
    📝 EXAMPLE USAGE:
    ```python
    # Import the enums first
    from agent_tools import ImageSize, ImageQuality
    
    # Generate premium quality artwork
    result = generate_images_advanced(
        prompt="A majestic snow leopard in a misty mountain landscape at dawn, highly detailed fur texture, golden hour lighting, photorealistic style, 8K quality",
        size=ImageSize.LANDSCAPE,
        quality=ImageQuality.HIGH
    )
    
    # Create marketing visual  
    result = generate_images_advanced(
        prompt="Modern minimalist product mockup of a smartphone on a clean white desk with soft shadows, professional photography style, high contrast",
        size=ImageSize.SQUARE, 
        quality=ImageQuality.HIGH
    )
    
    # Generate artistic concept
    result = generate_images_advanced(
        prompt="Surreal digital art of a floating city in the clouds, steampunk aesthetic, warm sunset colors, intricate mechanical details, fantasy illustration style",
        size=ImageSize.PORTRAIT,
        quality=ImageQuality.AUTO
    )
    ```
        
    📤 RETURNS:
    Dict containing:
    - success (bool): Whether generation succeeded
    - artwork_id (str): Unique identifier for the generated artwork
    - file_path (str): Local file system path to the saved image
    - file_url (str): Web URL to access the image
    - file_size (int): File size in bytes
    - model_used (dict): Information about the AI model used
    - generation_info (dict): All generation parameters and settings
    - message (str): Success message with details
    - db_artwork_id (str, if agent_id provided): Database record ID
    
    🔧 TECHNICAL NOTES:
    - Images are saved to static/artworks/ directory as PNG files
    - Database storage automatic when agent_id provided
    - Uses GPT Image model (gpt-image-1)
    - Generates exactly 1 image per call
    - Agent artwork count automatically updated in database
    - Premium quality requires valid API key with sufficient credits
    - All images are saved in PNG format with maximum quality preservation
    
    ⚠️ IMPORTANT CONSIDERATIONS:
    - Requires OPENAI_API_KEY environment variable
    - Each image generation consumes API credits
    - Higher quality images cost more but provide superior results
    - Respect usage policies and content guidelines
    - Generation time may be longer for higher quality images
    """
    try:
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return {"success": False, "error": "OPENAI_API_KEY not found"}
        
        # Ensure agent_id is provided by the agent system
        if not agent_id:
            logger.warning("⚠️  generate_images_advanced called without agent_id - database tracking disabled")
            print("⚠️  WARNING: generate_images_advanced called without agent_id. Artwork will not be tracked in database.")
        
        # Validate parameters using enums
        if not isinstance(size, ImageSize):
            return {"success": False, "error": f"Invalid size. Must be an ImageSize enum value."}
        
        if not isinstance(quality, ImageQuality):
            return {"success": False, "error": f"Invalid quality. Must be an ImageQuality enum value."}
        
        # Initialize client
        client = OpenAI(api_key=api_key)
        
        # Generate unique artwork ID
        artwork_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        
        # Ensure static directory exists
        static_dir = Path("static/artworks")
        static_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"🎨 Generating premium image with GPT Image")
        print(f"📝 Prompt: {prompt}")
        print(f"⚙️  Settings: {size.value}, {quality.value} quality")
        
        # Generate image using GPT Image model (hardcoded to 1 image)
        response = client.images.generate(
            model="gpt-image-1",
            prompt=prompt,
            n=1,
            size=size.value,
            quality=quality.value,
        )
        
        if not response.data:
            return {"success": False, "error": "No images generated by the API"}
        
        # Process the generated image
        image_data = response.data[0]
        
        # Create unique filename
        filename = f"artwork_{timestamp}_{artwork_id[:8]}.png"
        file_path = static_dir / filename
        
        # Decode base64 and save image
        image_bytes = base64.b64decode(image_data.b64_json)
        with open(file_path, "wb") as f:
            f.write(image_bytes)
        file_size = len(image_bytes)
        
        file_url = generate_full_url(filename)
        
        # Create vlayer content authenticity proof
        proof = None
        if agent_id:
            try:
                # Prepare request and response data for proof
                request_data = {
                    "model": "gpt-image-1",
                    "prompt": prompt,
                    "n": 1,
                    "size": size.value,
                    "quality": quality.value
                }
                
                response_data = {
                    "success": True,
                    "image_generated": True,
                    "model_used": "gpt-image-1",
                    "artwork_id": artwork_id
                }
                
                proof = create_content_proof(
                    agent_id=agent_id,
                    api_endpoint="https://api.openai.com/v1/images/generations",
                    request_data=request_data,
                    response_data=response_data,
                    prompt=prompt,
                    model_name="gpt-image-1",
                    generation_type="image"
                )
                
                if proof:
                    print(f"🔐 Content authenticity proof created: {proof.session_id}")
                
            except Exception as e:
                print(f"⚠️  Failed to create content proof: {e}")
        
        # Store in database if agent_id provided
        db_artwork_id = None
        if agent_id:
            db_artwork_id = store_artwork_in_db(
                agent_id=agent_id,
                artwork_id=artwork_id,
                prompt=prompt,
                negative_prompt="",  # GPT Image doesn't use negative prompts
                model_name="gpt-image-1",
                model_type="gpt_advanced",
                parameters={
                    "size": size.value,
                    "quality": quality.value
                },
                file_path=str(file_path),
                file_url=file_url,
                file_size=file_size,
                artwork_type="image",
                vlayer_proof_id=proof.session_id if proof else None
            )
        
        return {
            "success": True,
            "artwork_id": artwork_id,
            "file_path": str(file_path),
            "file_url": file_url,
            "file_size": file_size,
            "db_artwork_id": db_artwork_id,
            "model_used": {
                "name": "gpt-image-1",
                "display_name": "GPT Image",
                "category": "gpt_advanced",
                "type": "gpt_premium",
                "base_model": "GPT Image 1"
            },
            "generation_info": {
                "prompt": prompt,
                "parameters": {
                    "size": size.value,
                    "quality": quality.value
                }
            },
            "message": f"✨ Premium image generated successfully using GPT Image! Size: {size.value}" + (f" Database URL: /api/artworks/{db_artwork_id}" if db_artwork_id else "")
        }
        
    except Exception as e:
        print(f"❌ Error in generate_images_advanced: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": f"Premium image generation failed: {str(e)}"}

def list_available_video_models() -> Dict[str, Any]:
    """List all available AI video generation models organized by artistic style categories.
    
    🎬 VIDEO MODEL CATALOG TOOL
    Provides comprehensive information about available AI models for video generation,
    organized by artistic style categories with detailed specifications.
    
    🎯 MODEL CATEGORIES RETURNED:
    
    • REALISTIC - Photorealistic video generation
      - Model: Realistic Vision V5.1 (realisticVisionV51_v51VAE_94301.safetensors)
      - Type: Checkpoint (Stable Diffusion 1.5)
      - Best for: Realistic scenes, portraits, nature videos, documentary-style
      
    • ANIMATION - Animated and stylized video generation
      - Model: DreamShaper V8 (dreamshaper_8_93211.safetensors)
      - Type: Checkpoint (Stable Diffusion 1.5)
      - Best for: Animated sequences, stylized videos, character animations
      
    • DREAMY - Atmospheric and ethereal video generation
      - Model: DarkSushi Mix (darkSushiMixMix_225D_64380.safetensors)
      - Type: Checkpoint (Stable Diffusion 1.5)
      - Best for: Dreamy sequences, atmospheric videos, artistic content
      
    • DARK - Cinematic and dramatic video generation
      - Model: Epic Realism Natural (epicrealism_naturalSin_121250.safetensors)
      - Type: Checkpoint (Stable Diffusion 1.5)
      - Best for: Cinematic videos, dramatic scenes, moody content
    
    🎯 USAGE GUIDANCE:
    Use this tool to understand video model capabilities before calling generate_video().
    Each category is optimized for specific video styles and use cases.
    
    📝 EXAMPLE USAGE:
    ```python
    # Get all available video models and their details
    models_info = list_available_video_models()
    
    # Access specific category information
    realistic_info = models_info["categories"]["realistic"]
    print(realistic_info["description"])
    ```
        
    📤 RETURNS:
    Dict containing:
    - total_categories (int): Number of available video model categories
    - categories (dict): Detailed info for each category including:
      * display_name: Human-readable model name
      * description: What the model does best
      * model_type: "checkpoint"
      * base_model: Base AI model version
      * tags: Descriptive tags for the model
      * best_for: List of optimal use cases
    - model_selection_guide (dict): Quick reference for choosing models
    - usage_notes (dict): Important notes about model usage
    - error (str, if failed): Error description
    
    🔧 TECHNICAL NOTES:
    - No parameters required - returns all available video models
    - Information sourced from VideoModelRegistry
    - Used for model discovery and selection guidance
    - Safe to call frequently - no API requests made
    """
    try:
        return get_available_video_models()
    except Exception as e:
        logger.error(f"❌ Error listing video models: {str(e)}")
        return {
            "error": f"Failed to list video models: {str(e)}",
            "status": "error"
        }

# Global custom tool manager
custom_tool_manager = CustomToolManager()


def get_available_tools():
    """Get list of all available tools for agents."""
    tools = [
        {
            "name": "generate_image",
            "description": "Generate high-quality images using AI with intelligent model selection",
            "parameters": {
                "prompt": "string (required) - Detailed description of the image",
                "style_category": "string - Art style (realistic, anime, artistic, fantasy, abstract)",  
                "model_name": "string - Specific model or 'auto' for intelligent selection",
                "width": "integer - Image width (default: 512)",
                "height": "integer - Image height (default: 512)",
                "steps": "integer - Generation steps (default: 20)",
                "guidance_scale": "float - Prompt adherence (default: 7.5)",
                "negative_prompt": "string - Elements to avoid"
            }
        },
        {
            "name": "generate_images_advanced",
            "description": "Generate premium high-quality images using advanced GPT Image model",
            "parameters": {
                "prompt": "string (required) - Detailed, creative description of the image",
                "size": "ImageSize enum - Image dimensions (SQUARE: 1024x1024, LANDSCAPE: 1536x1024, PORTRAIT: 1024x1536)",
                "quality": "ImageQuality enum - Quality level (AUTO: automatic, HIGH: maximum quality, MEDIUM: balanced, LOW: faster)"
            }
        },
        {
            "name": "generate_video", 
            "description": "Generate video clips from text descriptions with model selection",
            "parameters": {
                "prompt": "string (required) - Description of the video with movement details",
                "model": "VideoModelCategory - Video model category (realistic, animation, dreamy, dark)",
                "width": "integer - Video width (default: 640)",
                "height": "integer - Video height (default: 480)", 
                "frames": "integer - Number of frames (default: 16)",
                "negative_prompt": "string - Elements to avoid in video"
            }
        },
        {
            "name": "list_available_models",
            "description": "List available AI image models with categories and capabilities",
            "parameters": {
                "category": "string - Filter by category (all, realistic, anime, artistic, fantasy, abstract)"
            }
        },
        {
            "name": "list_available_video_models",
            "description": "List available AI video generation models with categories and capabilities",
            "parameters": {}
        }
    ]
    
    # Add custom tools from the tool manager
    custom_tools = custom_tool_manager.list_tools()
    if custom_tools.get("success"):
        for tool_id, tool_data in custom_tools.get("tools", {}).items():
            tools.append({
                "name": tool_data.get("name", tool_id),
                "description": tool_data.get("description", "Custom API tool"),
                "parameters": tool_data.get("api_config", {}).get("request_schema", {}),
                "category": tool_data.get("category", "utility"),
                "type": "custom"
            })
    
    return tools


def get_tool_by_name(tool_name: str):
    """Get a specific tool by name."""
    tools = get_available_tools()
    for tool in tools:
        if tool["name"] == tool_name:
            return tool
    return None


def get_tools_by_names(tool_names: List[str]):
    """Get multiple tools by their names."""
    available_tools = get_available_tools()
    tool_dict = {tool["name"]: tool for tool in available_tools}
    
    return [tool_dict[name] for name in tool_names if name in tool_dict]


def get_agent_aware_tools(agent_id: str, blockchain_seed: Optional[int] = None) -> List[Any]:
    """Get tools that are aware of the agent context with automatic agent_id injection."""
    logger.info(f"🔧 Creating agent-aware tools for agent: {agent_id}")
    if blockchain_seed is not None:
        logger.info(f"🔗 Using blockchain seed for deterministic generation: {blockchain_seed}")
    
    # Create wrapped versions that auto-inject agent_id and blockchain_seed
    def agent_aware_generate_image(
        prompt: str,
        model: ImageModelCategory = ImageModelCategory.REALISTIC,
        width: int = 512,
        height: int = 512,
        steps: int = 20,
        guidance_scale: float = 7.5,
        negative_prompt: str = "",
        seed: Optional[int] = None
    ) -> Dict[str, Any]:
        """Agent-aware generate_image that automatically injects agent_id and blockchain_seed."""
        # Use blockchain_seed if no specific seed is provided
        if seed is None and blockchain_seed is not None:
            seed = blockchain_seed
            if seed > 10000:
                 seed = seed % 10000
            logger.info(f"🔗 Using blockchain seed for image generation: {seed}")
        
        logger.info(f"✅ Auto-injecting agent_id '{agent_id}' into generate_image call")
        return generate_image.invoke({
            'prompt': prompt,
            'model': model,
            'width': width,
            'height': height,
            'steps': steps,
            'guidance_scale': guidance_scale,
            'negative_prompt': negative_prompt,
            'seed': seed,
            'agent_id': agent_id
        })
    
    def agent_aware_generate_images_advanced(
        prompt: str,
        size: ImageSize = ImageSize.SQUARE,
        quality: ImageQuality = ImageQuality.AUTO
    ) -> Dict[str, Any]:
        """Agent-aware generate_images_advanced that automatically injects agent_id."""
        logger.info(f"✅ Auto-injecting agent_id '{agent_id}' into generate_images_advanced call")
        return generate_images_advanced.invoke({
            'prompt': prompt,
            'size': size,
            'quality': quality,
            'agent_id': agent_id
        })
    
    def agent_aware_generate_video(
        prompt: str,
        model: VideoModelCategory = VideoModelCategory.REALISTIC,
        width: int = 640,
        height: int = 480,
        frames: int = 16,
        negative_prompt: str = "",
        seed: Optional[int] = None
    ) -> Dict[str, Any]:
        """Agent-aware generate_video that automatically injects agent_id and blockchain_seed."""
        # Use blockchain_seed if no specific seed is provided
        if seed is None and blockchain_seed is not None:
            seed = blockchain_seed
            if seed > 10000:
                 seed = seed % 10000
            logger.info(f"🔗 Using blockchain seed for video generation: {seed}")
        
        logger.info(f"✅ Auto-injecting agent_id '{agent_id}' into generate_video call")
        return generate_video.invoke({
            'prompt': prompt,
            'model': model,
            'width': width,
            'height': height,
            'frames': frames,
            'negative_prompt': negative_prompt,
            'seed': seed,
            'agent_id': agent_id
        })
    
    # Create tools from the wrapped functions
    from langchain_core.tools import StructuredTool
    
    try:
        image_tool = StructuredTool.from_function(
            func=agent_aware_generate_image,
            name="generate_image",
            description=generate_image.__doc__
        )
        
        advanced_image_tool = StructuredTool.from_function(
            func=agent_aware_generate_images_advanced,
            name="generate_images_advanced",
            description=generate_images_advanced.__doc__
        )
        
        video_tool = StructuredTool.from_function(
            func=agent_aware_generate_video,
            name="generate_video", 
            description=generate_video.__doc__
        )
        
        tools = [image_tool, advanced_image_tool, video_tool]
        logger.info(f"🔧 Created {len(tools)} agent-aware tools: {[t.name for t in tools]}")
        
        return tools
        
    except Exception as e:
        logger.error(f"❌ Error creating agent-aware tools: {e}")
        # Fallback: return the raw tools without agent injection
        logger.warning("⚠️  Falling back to raw tools without agent context")
        return [generate_image, generate_images_advanced, generate_video]


def store_artwork_in_db(
    agent_id: str,
    artwork_id: str, 
    prompt: str,
    negative_prompt: str,
    model_name: str,
    model_type: str,
    parameters: Dict[str, Any],
    file_path: str,
    file_url: str,
    file_size: int,
    artwork_type: str = "image",
    vlayer_proof_id: Optional[str] = None
) -> str:
    """Store generated artwork (image or video) in database and return the database ID."""
    session = SessionLocal()
    try:
        # Validate required fields
        if not agent_id or not artwork_id:
            raise ValueError("agent_id and artwork_id are required")
        
        if not file_path or not file_url:
            raise ValueError("file_path and file_url are required")
            
        if file_size is None or file_size <= 0:
            logger.warning(f"⚠️  Invalid file_size {file_size} for artwork {artwork_id}")
            file_size = 0
        
        # Validate file exists if it's a local path
        if file_path.startswith('static/') or not file_path.startswith('http'):
            if not os.path.exists(file_path):
                logger.warning(f"⚠️  File does not exist at path: {file_path}")
        
        logger.info(f"💾 Storing artwork in database: {artwork_id}")
        logger.info(f"   Agent: {agent_id}")
        logger.info(f"   Type: {artwork_type}")
        logger.info(f"   Model: {model_name} ({model_type})")
        logger.info(f"   File: {file_path} ({file_size} bytes)")
        logger.info(f"   URL: {file_url}")
        
        db_artwork = GeneratedArtworkDB(
            id=artwork_id,
            agent_id=agent_id,
            artwork_type=artwork_type,
            prompt=prompt,
            negative_prompt=negative_prompt or "",
            model_name=model_name,
            model_type=model_type,
            parameters=parameters or {},
            file_path=file_path,
            file_url=file_url,
            file_size=file_size,
            artwork_metadata={
                "generation_timestamp": datetime.utcnow().isoformat(),
                "file_validated": os.path.exists(file_path) if not file_path.startswith('http') else True,
                "storage_backend": "local" if file_path.startswith('static/') else "remote"
            },
            vlayer_proof_id=vlayer_proof_id
        )
        session.add(db_artwork)
        session.commit()
        logger.info(f"✅ Artwork stored in database: {artwork_id}")
        
        # Update agent's artwork count and add artwork to their list
        from agent_config import agent_registry
        agent_config = agent_registry.get_agent_config(agent_id)
        agent_config.artworks_created += 1
        
        # Add artwork ID to agent's artwork list (keep only recent 100 to avoid excessive storage)
        if not hasattr(agent_config, 'artwork_ids') or agent_config.artwork_ids is None:
            agent_config.artwork_ids = []
        
        agent_config.artwork_ids.append(artwork_id)
                
        agent_registry.create_agent(agent_id, agent_config)
        logger.info(f"✅ Updated agent {agent_id}: {agent_config.artworks_created} total artworks, {len(agent_config.artwork_ids)} tracked IDs")
        
        return artwork_id
        
    except Exception as e:
        logger.error(f"❌ Error storing artwork {artwork_id}: {str(e)}")
        session.rollback()
        raise
    finally:
        session.close() 