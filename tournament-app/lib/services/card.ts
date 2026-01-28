import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { CARD_TIERS, SKILLS } from '@/lib/constants'

// Card dimensions
const CARD_WIDTH = 300
const CARD_HEIGHT = 450

// Profile position on card (adjusted for FIFA-style card frame)
const PROFILE_X = 30
const PROFILE_Y = 60
const PROFILE_WIDTH = 240
const PROFILE_HEIGHT = 280

// Text positions (bottom 1/3 of card for nickname/tier)
// Card height 450, bottom 1/3 starts at y=300
const TEXT_SKILL_X = 55          // Rating number (top-left)
const TEXT_SKILL_Y = 50
const TEXT_TIER_X = CARD_WIDTH - 55
const TEXT_TIER_Y = 50
const TEXT_NICKNAME_Y = 355      // Nickname in bottom 1/3 area
const TEXT_SKILL_LEVEL_Y = 385   // Skill level below nickname

/**
 * Remove background using Google Gemini API (Imagen 3) or Remove.bg as fallback
 *
 * Priority:
 * 1. Gemini Imagen 3 (if GOOGLE_AI_API_KEY is set)
 * 2. Remove.bg API (if REMOVEBG_API_KEY is set)
 * 3. Return original image (no background removal)
 */
export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const googleApiKey = process.env.GOOGLE_AI_API_KEY
  const removeBgApiKey = process.env.REMOVEBG_API_KEY

  // Try Gemini Imagen 3 first
  if (googleApiKey) {
    try {
      const result = await removeBackgroundWithGemini(imageBuffer, googleApiKey)
      if (result) {
        console.log('Background removed using Gemini Imagen')
        return result
      }
    } catch (error) {
      console.warn('Gemini background removal failed, trying fallback:', error)
    }
  }

  // Fallback to Remove.bg
  if (removeBgApiKey) {
    try {
      const result = await removeBackgroundWithRemoveBg(imageBuffer, removeBgApiKey)
      if (result) {
        console.log('Background removed using Remove.bg')
        return result
      }
    } catch (error) {
      console.warn('Remove.bg failed:', error)
    }
  }

  // No API keys available or all methods failed
  console.warn('No background removal API available, returning original image')
  return imageBuffer
}

/**
 * Remove background using Google Gemini Imagen
 * Uses gemini-2.0-flash-exp with image generation capabilities
 */
async function removeBackgroundWithGemini(imageBuffer: Buffer, apiKey: string): Promise<Buffer | null> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey)

    // Use Gemini 2.0 Flash Exp with explicit image output configuration
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        // @ts-expect-error - responseModalities is a valid option for image generation
        responseModalities: ['image', 'text'],
      },
    })

    const base64Image = imageBuffer.toString('base64')

    // More specific prompt for background removal
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/png',
          data: base64Image
        }
      },
      `Edit this image: Remove the entire background completely.
Keep ONLY the person/human subject in the image.
Make the background fully transparent (alpha = 0).
Do NOT change the person at all - keep them exactly as they are.
Output a PNG image with transparent background.`
    ])

    const response = result.response
    const parts = response.candidates?.[0]?.content?.parts || []

    // Find image part in response
    for (const part of parts) {
      if (part.inlineData?.data) {
        const imageData = part.inlineData.data
        return Buffer.from(imageData, 'base64')
      }
    }

    console.warn('Gemini did not return an image')
    return null

  } catch (error) {
    console.error('Gemini Imagen error:', error)
    return null
  }
}

/**
 * Remove background using Remove.bg API
 */
async function removeBackgroundWithRemoveBg(imageBuffer: Buffer, apiKey: string): Promise<Buffer | null> {
  try {
    const formData = new FormData()
    formData.append('image_file', new Blob([new Uint8Array(imageBuffer)]))
    formData.append('size', 'preview')

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey
      },
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Remove.bg API error:', errorText)
      return null
    }

    const resultBuffer = await response.arrayBuffer()
    return Buffer.from(resultBuffer)

  } catch (error) {
    console.error('Remove.bg request failed:', error)
    return null
  }
}

/**
 * Get card template path based on tier
 */
function getCardTemplatePath(tier: string): string {
  const templateMap: Record<string, string> = {
    '브론즈': 'bronze.webp',
    '실버': 'silver.webp',
    '골드': 'gold.jpeg',
    '스페셜': 'special.png',
    '레전드': 'legend.webp'
  }

  const filename = templateMap[tier] || templateMap['브론즈']
  return path.join(process.cwd(), 'public', 'card-templates', filename)
}

/**
 * Get skill value as a visual number (reverse: lower skill_value = higher display number)
 */
function getSkillDisplayValue(skillValue: number): number {
  // 소수 스킬값 → 카드 레이팅 변환
  const displayMap: Record<number, number> = { 1.0: 50, 2.0: 60, 2.6: 65, 3.2: 70, 3.8: 75, 4.4: 83, 5.0: 90 }
  return displayMap[skillValue] ?? 70
}

/**
 * Generate player card image
 * NOTE: Card compositing is currently DISABLED. Returns resized profile image only.
 * To re-enable, set ENABLE_CARD_COMPOSITING=true in .env.local
 */
export async function generatePlayerCard(
  profileBuffer: Buffer,
  cardTier: string,
  nickname: string,
  skill: string,
  skillValue: number
): Promise<Buffer> {
  try {
    // Card compositing disabled - just return resized profile image
    const CARD_COMPOSITING_ENABLED = process.env.ENABLE_CARD_COMPOSITING === 'true'

    if (!CARD_COMPOSITING_ENABLED) {
      console.log('Card compositing disabled, returning profile image')
      // Return resized profile image (square format for display)
      return sharp(profileBuffer)
        .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'cover' })
        .png()
        .toBuffer()
    }

    // === BELOW CODE IS DISABLED BUT PRESERVED ===
    // 1. Load card template
    const templatePath = getCardTemplatePath(cardTier)

    let templateBuffer: Buffer
    try {
      templateBuffer = await fs.readFile(templatePath)
    } catch {
      templateBuffer = await sharp({
        create: {
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          channels: 4,
          background: { r: 139, g: 90, b: 43, alpha: 1 }
        }
      })
        .png()
        .toBuffer()
    }

    // Resize template
    const template = await sharp(templateBuffer)
      .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'cover' })
      .png()
      .toBuffer()

    // 2. Try Gemini compositing
    const googleApiKey = process.env.GOOGLE_AI_API_KEY
    let cardBase: Buffer

    if (googleApiKey) {
      const geminiResult = await compositeWithGemini(profileBuffer, template, googleApiKey)
      if (geminiResult) {
        console.log('Card composited using Gemini')
        cardBase = geminiResult
      } else {
        console.log('Gemini failed, using fallback')
        cardBase = await fallbackComposite(profileBuffer, template)
      }
    } else {
      console.log('No API key, using fallback')
      cardBase = await fallbackComposite(profileBuffer, template)
    }

    // 3. Add text overlay
    const nicknameText = await createTextImage(nickname, 22, 'white', CARD_WIDTH)
    const skillText = await createTextImage(skill, 14, 'white', CARD_WIDTH)

    const finalCard = await sharp(cardBase)
      .composite([
        { input: nicknameText, top: TEXT_NICKNAME_Y - 20, left: 0 },
        { input: skillText, top: TEXT_SKILL_LEVEL_Y - 12, left: 0 }
      ])
      .png()
      .toBuffer()

    return finalCard
  } catch (error) {
    console.error('Card generation error:', error)
    throw error
  }
}

/**
 * Fallback composite without Gemini
 */
async function fallbackComposite(profileBuffer: Buffer, template: Buffer): Promise<Buffer> {
  const profile = await sharp(profileBuffer)
    .resize(PROFILE_WIDTH, PROFILE_HEIGHT, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  return sharp(template)
    .composite([{ input: profile, top: PROFILE_Y, left: PROFILE_X }])
    .png()
    .toBuffer()
}

/**
 * Create text as PNG image (supports Korean)
 */
async function createTextImage(
  text: string,
  fontSize: number,
  color: string,
  width: number
): Promise<Buffer> {
  const height = fontSize + 20
  const svg = `
    <svg width="${width}" height="${height}">
      <style>
        .text {
          font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif;
          font-weight: bold;
          fill: ${color};
          font-size: ${fontSize}px;
        }
      </style>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" class="text">${escapeXml(text)}</text>
    </svg>
  `
  return sharp(Buffer.from(svg)).png().toBuffer()
}

/**
 * Composite profile image onto card template using Gemini
 * Gemini handles background removal and compositing in one step
 */
async function compositeWithGemini(
  profileBuffer: Buffer,
  templateBuffer: Buffer,
  apiKey: string
): Promise<Buffer | null> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey)

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        // @ts-expect-error - responseModalities is a valid option for image generation
        responseModalities: ['image', 'text'],
      },
    })

    const profileBase64 = profileBuffer.toString('base64')
    const templateBase64 = templateBuffer.toString('base64')

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'image/png',
          data: profileBase64
        }
      },
      {
        inlineData: {
          mimeType: 'image/png',
          data: templateBase64
        }
      },
      `이미지 1과 이미지 2를 합성해서 FC26 선수 카드처럼 만들어줘.

인물은 어깨부터 머리까지만 크롭해서 합성하고, 인물은 원본 모습 그대로 유지해야 해. 가공하거나 변경하면 안되고 일관성 유지해줘.

인물은 카드의 3분의 1 지점 위에 위치시켜줘.`
    ])

    const response = result.response
    const parts = response.candidates?.[0]?.content?.parts || []

    for (const part of parts) {
      if (part.inlineData?.data) {
        const imageData = part.inlineData.data
        console.log('Gemini returned composited image')

        // Just resize to card dimensions, no black background removal
        const geminiResult = Buffer.from(imageData, 'base64')
        const processed = await sharp(geminiResult)
          .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'fill' })
          .png()
          .toBuffer()

        return processed
      }
    }

    console.warn('Gemini did not return a composited image')
    return null

  } catch (error) {
    console.error('Gemini compositing error:', error)
    return null
  }
}

/**
 * Escape special characters for XML/SVG
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Get next card tier
 */
export function getNextCardTier(currentTier: string): string | null {
  const index = CARD_TIERS.indexOf(currentTier as typeof CARD_TIERS[number])
  if (index === -1 || index >= CARD_TIERS.length - 1) {
    return null
  }
  return CARD_TIERS[index + 1]
}
