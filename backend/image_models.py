"""
Image model selection system for Memedici agents.
Provides categorized model options based on real Novita AI models.
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel


class ImageModelCategory(Enum):
    """Main image generation model categories for artistic agents."""
    
    REALISTIC = "realistic"
    ANIMATION = "animation"
    DREAMY = "dreamy"
    ARTISTIC = "artistic"


class VideoModelCategory(Enum):
    """Video generation model categories for artistic agents."""
    
    REALISTIC = "realistic"
    ANIMATION = "animation" 
    DREAMY = "dreamy"
    DARK = "dark"


class ModelInfo(BaseModel):
    """Information about a specific AI model."""
    model_name: str
    display_name: str
    model_type: str  # "checkpoint" or "lora"
    base_model: str  # "SD 1.5", "SDXL 1.0", etc.
    description: str
    tags: List[str]
    best_for: List[str]
    trigger_words: Optional[str] = None
    is_nsfw: bool = False
    is_sdxl: bool = False


class VideoModelInfo(BaseModel):
    """Information about a specific video AI model."""
    model_name: str
    display_name: str
    model_type: str  # "checkpoint"
    base_model: str  # "SD 1.5", etc.
    description: str
    tags: List[str]
    best_for: List[str]
    is_nsfw: bool = False


class ImageModelRegistry:
    """Registry of available image generation models categorized by style."""
    
    # Core models for each category
    MODELS = {
        ImageModelCategory.REALISTIC: ModelInfo(
            model_name="AnythingV5_v5PrtRE.safetensors",
            display_name="Anything V5",
            model_type="checkpoint",
            base_model="SD 1.5",
            description="High-quality realistic image generation with excellent detail and photorealistic results",
            tags=["photorealistic", "realistic", "detailed", "high-quality"],
            best_for=["portraits", "landscapes", "photography-style", "realistic scenes"],
            is_nsfw=False,
            is_sdxl=False
        ),
        
        ImageModelCategory.ANIMATION: ModelInfo(
            model_name="fustercluck_v2_233009.safetensors",
            display_name="Fustercluck V2",
            model_type="checkpoint", 
            base_model="SD 1.5",
            description="Specialized model for animated and cartoon-style artwork with vibrant colors",
            tags=["animation", "cartoon", "animated", "stylized"],
            best_for=["cartoon characters", "animated scenes", "stylized art", "vibrant imagery"],
            is_nsfw=False,
            is_sdxl=False
        ),
        
        ImageModelCategory.DREAMY: ModelInfo(
            model_name="Dreamyvibes artstyle SDXL - Trigger with dreamyvibes artstyle_225787.safetensors",
            display_name="Dreamy Vibes Art Style",
            model_type="lora",
            base_model="SDXL 1.0", 
            description="Creates ethereal, dreamy artwork with pastel colors and soft aesthetics",
            tags=["pastel", "style", "artstyle", "dreamy", "ethereal", "soft"],
            best_for=["dreamy landscapes", "ethereal portraits", "pastel art", "fantasy scenes"],
            trigger_words="dreamyvibes artstyle",
            is_nsfw=False,
            is_sdxl=True
        ),
        
        ImageModelCategory.ARTISTIC: ModelInfo(
            model_name="Line Art Style LoRA XL_238329",
            display_name="Line Art Style LoRA XL",
            model_type="lora",
            base_model="SDXL 1.0",
            description="Specialized for creating clean line art and artistic illustrations",
            tags=["line art", "artistic", "illustration", "clean", "minimalist"],
            best_for=["line drawings", "artistic illustrations", "clean art", "minimalist designs"],
            is_nsfw=False,
            is_sdxl=True
        )
    }
    
    @classmethod
    def get_model_info(cls, category: ImageModelCategory) -> ModelInfo:
        """Get model information for a specific category."""
        return cls.MODELS[category]
    
    @classmethod
    def get_model_name(cls, category: ImageModelCategory) -> str:
        """Get the model name for a specific category."""
        return cls.MODELS[category].model_name
    
    @classmethod
    def get_all_categories(cls) -> List[ImageModelCategory]:
        """Get all available model categories."""
        return list(cls.MODELS.keys())
    
    @classmethod
    def get_category_info(cls) -> Dict[str, Dict[str, Any]]:
        """Get comprehensive information about all categories."""
        return {
            category.value: {
                "display_name": model_info.display_name,
                "description": model_info.description,
                "model_type": model_info.model_type,
                "base_model": model_info.base_model,
                "tags": model_info.tags,
                "best_for": model_info.best_for,
                "trigger_words": model_info.trigger_words,
                "is_sdxl": model_info.is_sdxl
            }
            for category, model_info in cls.MODELS.items()
        }


def get_available_models() -> Dict[str, Any]:
    """Get information about all available models for agents."""
    categories = ImageModelRegistry.get_category_info()
    
    return {
        "total_categories": len(categories),
        "categories": categories,
        "model_selection_guide": {
            "realistic": "Best for photorealistic images, portraits, and realistic scenes",
            "animation": "Perfect for cartoon characters, animated scenes, and stylized art", 
            "dreamy": "Ideal for ethereal, fantasy art with soft pastel aesthetics",
            "artistic": "Excellent for line art, illustrations, and artistic drawings"
        },
        "usage_notes": {
            "lora_models": "LoRA models may require trigger words - check trigger_words field",
            "sdxl_models": "SDXL models generally produce higher quality results",
            "prompt_enhancement": "Prompts are automatically enhanced based on selected category"
        }
    }


def select_model_for_agent(style_category: str, agent_preferences: Optional[Dict[str, Any]] = None) -> tuple[ImageModelCategory, ModelInfo]:
    """Select appropriate model for an agent based on style category and preferences."""
    
    # Convert string to enum
    try:
        category = ImageModelCategory(style_category.lower())
    except ValueError:
        # Default fallback
        category = ImageModelCategory.REALISTIC
    
    model_info = ImageModelRegistry.get_model_info(category)
    
    return category, model_info 


class VideoModelRegistry:
    """Registry of available video generation models categorized by style."""
    
    MODELS = {
        VideoModelCategory.REALISTIC: VideoModelInfo(
            model_name="realisticVisionV51_v51VAE_94301.safetensors",
            display_name="Realistic Vision V5.1",
            model_type="checkpoint",
            base_model="SD 1.5",
            description="High-quality realistic video generation with excellent photorealistic results and smooth motion",
            tags=["photorealistic", "realistic", "detailed", "smooth-motion"],
            best_for=["realistic scenes", "portraits", "nature videos", "documentary-style"],
            is_nsfw=False
        ),
        
        VideoModelCategory.ANIMATION: VideoModelInfo(
            model_name="dreamshaper_8_93211.safetensors", 
            display_name="DreamShaper V8",
            model_type="checkpoint",
            base_model="SD 1.5",
            description="Versatile model excellent for animated and stylized video content with vibrant colors",
            tags=["animation", "stylized", "versatile", "vibrant"],
            best_for=["animated sequences", "stylized videos", "character animations", "fantasy scenes"],
            is_nsfw=False
        ),
        
        VideoModelCategory.DREAMY: VideoModelInfo(
            model_name="darkSushiMixMix_225D_64380.safetensors",
            display_name="DarkSushi Mix",
            model_type="checkpoint", 
            base_model="SD 1.5",
            description="Creates dreamy, ethereal video content with artistic flair and atmospheric effects",
            tags=["dreamy", "atmospheric", "artistic", "ethereal"],
            best_for=["dreamy sequences", "atmospheric videos", "artistic content", "surreal scenes"],
            is_nsfw=False
        ),
        
        VideoModelCategory.DARK: VideoModelInfo(
            model_name="epicrealism_naturalSin_121250.safetensors",
            display_name="Epic Realism Natural",
            model_type="checkpoint",
            base_model="SD 1.5", 
            description="Specialized for dramatic and cinematic video content with rich details and contrast",
            tags=["cinematic", "dramatic", "detailed", "high-contrast"],
            best_for=["cinematic videos", "dramatic scenes", "detailed environments", "moody content"],
            is_nsfw=False
        )
    }
    
    @classmethod
    def get_model_info(cls, category: VideoModelCategory) -> VideoModelInfo:
        """Get model information for a specific video category."""
        return cls.MODELS[category]
    
    @classmethod
    def get_model_name(cls, category: VideoModelCategory) -> str:
        """Get the model name for a specific video category."""
        return cls.MODELS[category].model_name
    
    @classmethod
    def get_all_categories(cls) -> List[VideoModelCategory]:
        """Get all available video model categories."""
        return list(cls.MODELS.keys())
    
    @classmethod
    def get_category_info(cls) -> Dict[str, Dict[str, Any]]:
        """Get comprehensive information about all video categories."""
        return {
            category.value: {
                "display_name": model_info.display_name,
                "description": model_info.description,
                "model_type": model_info.model_type,
                "base_model": model_info.base_model,
                "tags": model_info.tags,
                "best_for": model_info.best_for,
            }
            for category, model_info in cls.MODELS.items()
        }


def get_available_video_models() -> Dict[str, Any]:
    """Get information about all available video generation models."""
    try:
        return {
            "total_categories": len(VideoModelRegistry.get_all_categories()),
            "categories": VideoModelRegistry.get_category_info(),
            "model_selection_guide": {
                "realistic": "Best for photorealistic videos, portraits, nature scenes",
                "animation": "Perfect for animated content, stylized videos, character animations", 
                "dreamy": "Ideal for atmospheric, ethereal, and artistic video content",
                "dark": "Excellent for cinematic, dramatic, and moody video sequences"
            },
            "usage_notes": {
                "frame_range": "Recommended 16-128 frames per video",
                "resolution": "Common sizes: 640x480, 768x576, 1024x768",
                "guidance_scale": "Fixed at 7.5 for optimal results",
                "steps": "Fixed at 20 for quality/speed balance"
            }
        }
    except Exception as e:
        return {"error": f"Failed to get video models: {str(e)}"}