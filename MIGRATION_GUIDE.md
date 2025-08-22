# Migration Guide: Google Services → OpenAI + Cloudflare R2

This document outlines the migration from Google services to OpenAI and Cloudflare R2, including required environment variables and setup instructions.

## Overview

The application has been migrated from:
- **Google Gemini AI** → **OpenAI GPT models**
- **Google Cloud Storage** → **Cloudflare R2**  
- **Google Text-to-Speech** → **OpenAI TTS**

## Required Environment Variables

### OpenAI Configuration
```env
OPENAI_API_KEY=sk-...
```

**Setup Instructions:**
1. Create an account at [OpenAI Platform](https://platform.openai.com/)
2. Generate an API key in the API keys section
3. Add billing information to your OpenAI account
4. Set rate limits as needed for your usage

### Cloudflare R2 Configuration
```env
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-access-key
CLOUDFLARE_R2_BUCKET_NAME=your-bucket-name
CLOUDFLARE_R2_PUBLIC_DOMAIN=your-custom-domain.com  # Optional
```

**Setup Instructions:**
1. Create a Cloudflare account at [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to R2 Object Storage
3. Create a new R2 bucket
4. Generate R2 API tokens:
   - Go to "Manage R2 API tokens"  
   - Create a new token with "Object Read & Write" permissions
   - Note down the Access Key ID and Secret Access Key
5. Find your Account ID in the right sidebar of the Cloudflare dashboard
6. (Optional) Set up a custom domain for public access

### Environment Variables to Remove
```env
# Remove these Google-related variables:
GEMINI_API_KEY=...
GCP_SERVICE_ACCOUNT_B64=...
GCS_BUCKET_NAME=...
```

## Model Mappings

The following AI models are now used:

| Use Case | Previous (Google) | New (OpenAI) | Reason |
|----------|-------------------|--------------|---------|
| Live Mode | Gemini 2.5 Flash | gpt-4o-mini | Fastest, cheapest for real-time |
| Chat Mode | Gemini 2.5 Pro | gpt-4o-mini | Good balance of speed/cost |
| Final Evaluations | Gemini 2.5 Flash | gpt-4o | Most capable for complex analysis |
| Job Processing | Gemini 2.5 Flash | gpt-4o | Advanced reasoning capabilities |

## TTS Configuration

- **Voice**: Female voice "nova" (similar to Siri/Alexa)
- **Model**: tts-1 (standard quality, faster)
- **Speed**: 1.4x (matches previous Google TTS speed setting)

## Important Changes

### Video Analysis
- **Previous**: Google Gemini supported direct video file analysis
- **Current**: OpenAI doesn't support video files directly
- **Solution**: Video analysis now uses transcript-based analysis, which maintains functionality while using the audio transcription

### Storage URLs
- **Previous**: `gs://bucket/file` (Google Cloud Storage)
- **Current**: `https://bucket.account-id.r2.cloudflarestorage.com/file` (Cloudflare R2)
- **Custom Domains**: If `CLOUDFLARE_R2_PUBLIC_DOMAIN` is set, uses `https://custom-domain.com/file`

### Public Access
- R2 buckets need to be configured for public access if you want direct file URLs
- Alternatively, use signed URLs for temporary access (already implemented)

## Testing the Migration

1. **AI Endpoints**: Test `/api/ai`, `/api/chat`, `/api/analyze-full-session`
2. **File Upload**: Test file upload and storage via the upload endpoints
3. **TTS**: Test text-to-speech functionality
4. **Job Processing**: Submit a job and verify it processes correctly

## Costs Comparison

### OpenAI Pricing (approximate)
- **gpt-4o-mini**: $0.15/1M input tokens, $0.60/1M output tokens
- **gpt-4o**: $2.50/1M input tokens, $10.00/1M output tokens  
- **TTS**: $15.00/1M characters

### Cloudflare R2 Pricing
- **Storage**: $0.015/GB/month
- **Class A Operations** (PUT, COPY, POST, LIST): $4.50/million
- **Class B Operations** (GET, HEAD): $0.36/million
- **Egress**: Free (major advantage over GCS)

## Troubleshooting

### Common Issues
1. **OpenAI API Key Invalid**: Ensure you have billing set up on your OpenAI account
2. **R2 Access Denied**: Verify your API tokens have the correct permissions
3. **Bucket Not Found**: Ensure the bucket name matches exactly
4. **CORS Issues**: Configure CORS settings in your R2 bucket if needed

### Logs to Check
- Check application logs for "OpenAI" or "R2" related errors
- Verify environment variables are loaded correctly
- Test API endpoints individually to isolate issues

## Rollback Plan

If you need to rollback to Google services:
1. Restore the Google environment variables
2. Revert the code changes (available in git history)
3. Install Google dependencies: `npm install @google/generative-ai @google-cloud/storage @google-cloud/text-to-speech @google-cloud/vertexai`

## Support

For issues related to:
- **OpenAI**: [OpenAI Support](https://help.openai.com/)
- **Cloudflare R2**: [Cloudflare Support](https://support.cloudflare.com/)
- **Migration Issues**: Check the git commit history for detailed changes