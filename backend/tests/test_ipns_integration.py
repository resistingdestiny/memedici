#!/usr/bin/env python3
"""
Test script to verify complete IPNS integration with MemeDici system
"""

from decentralized_dataset import DecentralizedDatasetManager
import json

def test_ipns_integration():
    """Test the complete IPNS integration."""
    
    print("🧪 Testing Complete IPNS Integration")
    print("=" * 50)
    
    # Initialize dataset manager
    dataset_manager = DecentralizedDatasetManager()
    
    # Test 1: Check IPNS configuration
    print("\n📋 Test 1: IPNS Configuration")
    ipns_info = dataset_manager.get_ipns_info()
    print(json.dumps(ipns_info, indent=2))
    
    # Test 2: Upload and publish to IPNS
    print("\n🚀 Test 2: Upload and Publish to IPNS")
    
    test_data = {
        "test": "Complete IPNS integration test",
        "timestamp": "2025-05-31T23:45:00Z",
        "entries": [
            {"id": "entry_1", "prompt": "Test prompt 1", "response": "Test response 1"},
            {"id": "entry_2", "prompt": "Test prompt 2", "response": "Test response 2"}
        ]
    }
    
    result = dataset_manager.upload_and_publish_to_ipns(test_data, "integration_test.json")
    print("Upload Result:")
    print(json.dumps(result, indent=2))
    
    if result["success"] and result.get("ipns_published"):
        print("\n🎉 IPNS Integration Test SUCCESSFUL!")
        print(f"✅ IPNS Address: {result['ipns_address']}")
        print(f"✅ Direct CID: {result['direct_url']}")
        return True
    else:
        print("\n❌ IPNS Integration Test FAILED")
        return False

if __name__ == "__main__":
    success = test_ipns_integration()
    
    if success:
        print("\n🏆 MemeDici IPNS integration is working perfectly!")
        print("🚀 Ready for hackathon deployment!")
    else:
        print("\n⚠️  IPNS integration needs attention")
        print("💡 Check lighthouse-web3 CLI setup and configuration") 