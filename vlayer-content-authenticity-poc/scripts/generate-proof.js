#!/usr/bin/env node

/**
 * Generate Web Proof for AI Content Generation
 * This script simulates capturing API calls to AI services and generating vlayer proofs
 */

const { execSync } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class ContentAuthenticityProofGenerator {
    constructor() {
        this.notaryUrl = process.env.VLAYER_NOTARY_URL || 'https://test-notary.vlayer.xyz';
        this.outputDir = './proofs';
        
        // Ensure output directory exists
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Generate web proof for Novita AI image generation
     */
    async generateNovitaProof(prompt, modelName = "AnythingV5_v5PrtRE.safetensors") {
        console.log('🎨 Generating Novita AI web proof...');
        
        const apiUrl = 'https://api.novita.ai/v3/async/txt2img';
        const apiKey = process.env.NOVITA_API_KEY;
        
        if (!apiKey) {
            throw new Error('NOVITA_API_KEY not found in environment variables');
        }

        // Prepare API request data
        const requestData = {
            model_name: modelName,
            prompt: prompt,
            width: 512,
            height: 512,
            steps: 20,
            guidance_scale: 7.5,
            seed: -1,
            sampler_name: "DPM++ 2S a Karras"
        };

        // Use vlayer CLI to capture the API call
        const contentId = `novita_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Generate web proof using vlayer CLI
            const vlayerCommand = [
                'vlayer web-proof-fetch',
                `--url "${apiUrl}"`,
                `--notary "${this.notaryUrl}"`,
                `-H "Authorization: Bearer ${apiKey}"`,
                `-H "Content-Type: application/json"`,
                `-d '${JSON.stringify(requestData)}'`
            ].join(' ');

            console.log('📡 Executing vlayer command:', vlayerCommand);
            
            // Execute the command and capture the web proof
            const webProofOutput = execSync(vlayerCommand, { 
                encoding: 'utf8',
                stdio: 'pipe'
            });

            // Parse the web proof response
            const webProof = JSON.parse(webProofOutput);
            
            // Save proof to file
            const proofFile = path.join(this.outputDir, `${contentId}_novita_proof.json`);
            fs.writeFileSync(proofFile, JSON.stringify({
                contentId,
                service: 'novita',
                prompt,
                modelName,
                timestamp: Date.now(),
                webProof,
                requestData
            }, null, 2));

            console.log('✅ Novita web proof generated successfully!');
            console.log(`📁 Proof saved to: ${proofFile}`);
            
            return {
                contentId,
                proofFile,
                webProof,
                metadata: {
                    service: 'novita',
                    prompt,
                    modelName,
                    timestamp: Date.now()
                }
            };

        } catch (error) {
            console.error('❌ Error generating Novita proof:', error.message);
            
            // Fallback: Create mock proof for demo purposes
            return this.generateMockProof('novita', prompt, modelName, contentId);
        }
    }

    /**
     * Generate web proof for OpenAI image generation
     */
    async generateOpenAIProof(prompt, model = "gpt-image-1", size = "1024x1024") {
        console.log('🤖 Generating OpenAI web proof...');
        
        const apiUrl = 'https://api.openai.com/v1/images/generations';
        const apiKey = process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY not found in environment variables');
        }

        const requestData = {
            model,
            prompt,
            n: 1,
            size,
            response_format: "b64_json"
        };

        const contentId = `openai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            const vlayerCommand = [
                'vlayer web-proof-fetch',
                `--url "${apiUrl}"`,
                `--notary "${this.notaryUrl}"`,
                `-H "Authorization: Bearer ${apiKey}"`,
                `-H "Content-Type: application/json"`,
                `-d '${JSON.stringify(requestData)}'`
            ].join(' ');

            console.log('📡 Executing vlayer command:', vlayerCommand);
            
            const webProofOutput = execSync(vlayerCommand, { encoding: 'utf8' });
            const webProof = JSON.parse(webProofOutput);
            
            const proofFile = path.join(this.outputDir, `${contentId}_openai_proof.json`);
            fs.writeFileSync(proofFile, JSON.stringify({
                contentId,
                service: 'openai',
                prompt,
                model,
                size,
                timestamp: Date.now(),
                webProof,
                requestData
            }, null, 2));

            console.log('✅ OpenAI web proof generated successfully!');
            console.log(`📁 Proof saved to: ${proofFile}`);
            
            return {
                contentId,
                proofFile,
                webProof,
                metadata: {
                    service: 'openai',
                    prompt,
                    model,
                    size,
                    timestamp: Date.now()
                }
            };

        } catch (error) {
            console.error('❌ Error generating OpenAI proof:', error.message);
            return this.generateMockProof('openai', prompt, model, contentId);
        }
    }

    /**
     * Generate mock proof for demo purposes when vlayer CLI is not available
     */
    generateMockProof(service, prompt, model, contentId) {
        console.log(`🔄 Generating mock proof for ${service}...`);
        
        const mockWebProof = {
            url: service === 'novita' ? 'https://api.novita.ai/v3/async/txt2img' : 'https://api.openai.com/v1/images/generations',
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'authorization': 'Bearer [REDACTED]',
                'date': new Date().toISOString()
            },
            request_body: JSON.stringify({
                prompt,
                model_name: model,
                ...(service === 'novita' ? {
                    width: 512,
                    height: 512,
                    steps: 20
                } : {
                    size: "1024x1024",
                    n: 1
                })
            }),
            response: {
                status: 200,
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    success: true,
                    data: service === 'novita' ? {
                        images_encoded: ['base64_encoded_image_data_here']
                    } : {
                        data: [{
                            b64_json: 'base64_encoded_image_data_here'
                        }]
                    },
                    timestamp: Date.now()
                })
            },
            notary_signature: 'mock_signature_for_demo',
            proof_timestamp: Date.now()
        };

        const proofFile = path.join(this.outputDir, `${contentId}_${service}_mock_proof.json`);
        fs.writeFileSync(proofFile, JSON.stringify({
            contentId,
            service,
            prompt,
            model,
            timestamp: Date.now(),
            webProof: mockWebProof,
            isMockProof: true
        }, null, 2));

        console.log('✅ Mock proof generated for demo!');
        console.log(`📁 Mock proof saved to: ${proofFile}`);
        
        return {
            contentId,
            proofFile,
            webProof: mockWebProof,
            isMockProof: true,
            metadata: {
                service,
                prompt,
                model,
                timestamp: Date.now()
            }
        };
    }

    /**
     * List all generated proofs
     */
    listProofs() {
        const proofFiles = fs.readdirSync(this.outputDir).filter(file => file.endsWith('_proof.json'));
        
        console.log('\n📋 Generated Proofs:');
        proofFiles.forEach(file => {
            const proofPath = path.join(this.outputDir, file);
            const proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
            
            console.log(`\n🔍 ${file}`);
            console.log(`   Service: ${proof.service}`);
            console.log(`   Content ID: ${proof.contentId}`);
            console.log(`   Prompt: "${proof.prompt}"`);
            console.log(`   Generated: ${new Date(proof.timestamp).toLocaleString()}`);
            console.log(`   Mock: ${proof.isMockProof ? 'Yes' : 'No'}`);
        });
    }
}

// CLI interface
async function main() {
    const generator = new ContentAuthenticityProofGenerator();
    
    const args = process.argv.slice(2);
    const command = args[0];

    try {
        switch (command) {
            case 'novita':
                const novitaPrompt = args[1] || "a beautiful landscape with mountains and lake, photorealistic, 4k";
                const novitaModel = args[2] || "AnythingV5_v5PrtRE.safetensors";
                await generator.generateNovitaProof(novitaPrompt, novitaModel);
                break;
                
            case 'openai':
                const openaiPrompt = args[1] || "a futuristic city with flying cars, digital art style";
                const openaiModel = args[2] || "gpt-image-1";
                await generator.generateOpenAIProof(openaiPrompt, openaiModel);
                break;
                
            case 'list':
                generator.listProofs();
                break;
                
            case 'demo':
                console.log('🚀 Running full demo...');
                
                // Generate sample proofs
                await generator.generateNovitaProof("cyberpunk cat with neon lights", "AnythingV5_v5PrtRE.safetensors");
                await generator.generateOpenAIProof("minimalist logo design for AI company", "gpt-image-1");
                
                generator.listProofs();
                break;
                
            default:
                console.log(`
🎨 MemeDici Content Authenticity Proof Generator

Usage:
  node generate-proof.js novita "your prompt" [model]
  node generate-proof.js openai "your prompt" [model] 
  node generate-proof.js list
  node generate-proof.js demo

Examples:
  node generate-proof.js novita "a dragon in space, fantasy art"
  node generate-proof.js openai "modern architecture building"
  node generate-proof.js demo

Environment Variables Required:
  NOVITA_API_KEY    - Your Novita AI API key
  OPENAI_API_KEY    - Your OpenAI API key
  VLAYER_NOTARY_URL - vlayer notary URL (optional)
                `);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = ContentAuthenticityProofGenerator; 