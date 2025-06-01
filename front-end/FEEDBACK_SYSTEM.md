# AI Chat Feedback System Implementation

This document describes the implementation of the feedback system for rating AI agent responses in the chat interface, based on the Memedici API endpoint `/dataset/feedback`.

## Overview

The feedback system allows users to rate and provide feedback on AI agent responses, with potential token rewards for participation. The system requires wallet connection for authentication and uses cryptographic signatures to verify feedback authenticity.

## Features

- ⭐ **5-star rating system** (1-5 scale, higher = better)
- 👍👎 **Helpful/Not Helpful** toggle
- 🚩 **Issue flagging** for inappropriate content, low quality, or copyright violations
- 💬 **Optional comments** (up to 500 characters)
- 🔐 **Wallet authentication** with cryptographic signatures
- 💰 **Token rewards** for valid feedback submissions

## Implementation Components

### 1. Type Definitions

Updated the following interfaces in `lib/types.ts` and `lib/api.ts`:

```typescript
export interface ChatResponse {
  // ... existing fields
  dataset_entry_id?: string; // Added for feedback tracking
}

export interface DatasetFeedbackRequest {
  entry_id: string;
  rating: number; // 1-5 star rating
  flags?: string[]; // "inappropriate", "low_quality", "copyright_violation"
  comments?: string;
  helpful?: boolean;
  wallet_address: string;
  signed_message: string; // Must include entry_id
  signature: string;
}

export interface ChatMessage {
  // ... existing fields
  dataset_entry_id?: string; // Added for feedback on agent responses
}
```

### 2. API Integration

Added feedback submission function in `lib/api.ts`:

```typescript
export async function submitFeedback(feedbackData: DatasetFeedbackRequest): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await api.post('/dataset/feedback', feedbackData);
    return { success: true };
  } catch (error: any) {
    console.error('Error submitting feedback:', error);
    return { 
      success: false, 
      error: error?.response?.data?.detail || error?.message || 'Failed to submit feedback' 
    };
  }
}
```

### 3. UI Components

#### FeedbackModal (`components/ui/feedback-modal.tsx`)
- Full-featured feedback form with star rating, helpful toggle, flags, and comments
- Wallet connection verification and signature generation
- Form validation and error handling
- Success/error feedback with toast notifications

#### FeedbackButton (`components/ui/feedback-button.tsx`)
- Small, unobtrusive button for triggering feedback modal
- Only shows when `dataset_entry_id` is available
- Positioned next to message timestamp

### 4. Chat Interface Integration

#### CityScene Integration (`components/three-scene/city-scene.tsx`)
- Added feedback button to agent responses
- Button appears next to timestamp for eligible messages

#### Agent Profile Integration (`app/agents/[id]/agent-profile-client.tsx`)
- Added feedback button to agent responses in profile chat
- Consistent positioning and styling

## Usage Flow

1. **User chats with AI agent** - Normal chat interaction
2. **Agent responds** - Response includes `dataset_entry_id` if eligible for feedback
3. **Feedback button appears** - Small "Rate" button next to message timestamp
4. **User clicks feedback button** - Opens detailed feedback modal
5. **User provides feedback**:
   - Required: Star rating (1-5)
   - Optional: Helpful/Not Helpful toggle
   - Optional: Issue flags (inappropriate, low quality, copyright)
   - Optional: Comments (up to 500 characters)
6. **Wallet signature** - User signs message with their connected wallet
7. **Submission** - Feedback sent to `/dataset/feedback` endpoint
8. **Rewards** - User may earn token rewards for valid feedback

## Authentication & Security

The system uses Web3 wallet signatures for authentication:

```typescript
const message = `${entryId}:${rating}`;
const signature = await window.ethereum.request({
  method: 'personal_sign',
  params: [message, walletAddress],
});
```

This ensures:
- Only wallet owners can submit feedback
- Feedback is tied to verified wallet addresses
- Prevents spam and duplicate submissions
- Enables token reward distribution

## API Endpoint Details

**Endpoint**: `POST /dataset/feedback`

**Request Body**:
```json
{
  "entry_id": "c97a4a28-9c0f-4e00-b237-0b2d8e0f6f61",
  "rating": 5,
  "flags": [],
  "comments": "Great answer—clear and creative!",
  "helpful": true,
  "wallet_address": "0xABCD...1234",
  "signed_message": "c97a4a28-9c0f-4e00-b237-0b2d8e0f6f61:5",
  "signature": "0x6ef9...be90"
}
```

**Response**: `200 OK` with empty object `{}` on success

## Integration Points

### Chat Message Updates
- `ChatMessage` interface includes `dataset_entry_id`
- Chat store (`lib/stores/use-agents.ts`) preserves entry ID from API responses
- UI components check for entry ID before showing feedback button

### Wallet Integration
- Uses existing `useWallet` hook for connection status and address
- Leverages `window.ethereum` for signature generation
- Integrates with existing wallet connection flow

## Error Handling

- **No wallet**: Shows warning and prompts to connect wallet
- **Missing rating**: Validates required fields before submission
- **Signature failure**: Catches and displays user-friendly error messages
- **API errors**: Displays specific error messages from backend
- **Network issues**: Graceful degradation with retry suggestions

## Future Enhancements

- **Feedback history**: Track user's submitted feedback
- **Reputation system**: Build user reputation based on feedback quality
- **Advanced analytics**: Aggregate feedback for agent improvement
- **Bulk feedback**: Rate multiple responses at once
- **Feedback rewards dashboard**: Show earned tokens and statistics

## Testing

To test the feedback system:

1. Start the development server: `npm run dev`
2. Navigate to any agent chat interface
3. Send a message to an AI agent
4. Look for the "Rate" button next to agent responses
5. Connect wallet if not already connected
6. Click "Rate" and fill out the feedback form
7. Verify signature process and submission

The feedback system is now fully integrated and ready for user testing! 