# Environment Variables Configuration

After migrating from Google services to OpenAI and Cloudflare R2, you'll need to set up the following environment variables:

## OpenAI Configuration
```
OPENAI_API_KEY=your_openai_api_key_here
```
- Get this from your OpenAI dashboard (https://platform.openai.com/api-keys)
- Make sure your account has access to GPT-5 models (gpt-5-nano and gpt-5-mini)

## Cloudflare R2 Configuration
```
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_r2_bucket_name
R2_CUSTOM_DOMAIN=your_custom_domain_optional
```

### How to get Cloudflare R2 credentials:
1. Log into your Cloudflare dashboard
2. Go to R2 Object Storage
3. Create a new bucket (or use existing)
4. Go to "Manage R2 API tokens"
5. Create a new API token with R2 permissions
6. Note down your Account ID, Access Key ID, and Secret Access Key

## Other Environment Variables (unchanged)
```
# Database
DATABASE_URL=your_database_url

# Deepgram (for transcription)
DEEPGRAM_API_KEY=your_deepgram_api_key

# Redis (if used)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Email (if used)
SMTP_HOST=your_smtp_host
SMTP_PORT=your_smtp_port
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

## Removed Environment Variables
The following Google service environment variables are no longer needed:
- ~~GEMINI_API_KEY~~
- ~~GCP_SERVICE_ACCOUNT_B64~~
- ~~GCS_BUCKET_NAME~~

## Services Setup Required

### 1. OpenAI Account
- Sign up at https://platform.openai.com/
- Add payment method (required for API access)
- Generate API key
- Ensure access to GPT-5 models

### 2. Cloudflare Account
- Sign up at https://cloudflare.com/
- Enable R2 Object Storage
- Create a bucket for file storage
- Generate API tokens with R2 permissions
- Optional: Set up a custom domain for public file access

## Migration Notes
- All AI functionality now uses OpenAI's GPT models instead of Google Gemini
- File storage now uses Cloudflare R2 instead of Google Cloud Storage
- Text-to-speech now uses OpenAI TTS with a female voice (nova) instead of Google Cloud TTS
- Database schema remains unchanged - existing data is compatible