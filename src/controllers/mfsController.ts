import type { MFSPlatform, MFSRequestResult } from '../types';

/**
 * ⚡ LOCAL MFS UTILITY (Common Global Component)
 * 
 * Generates custom-formatted payment reminder messages tailored for Bangladeshi MFS:
 * bKash, Nagad, Rocket, Upay.
 * 
 * Format requirement:
 * "Hey! Your share for [Reason] is [Amount] BDT. Please Send Money to my personal [bKash/Nagad] number: [Manager Number]. Thank you!"
 */
export function generateMFSRequest(
  managerNumber: string,
  amount: number,
  reason: string,
  platform: MFSPlatform = 'bKash',
  recipientName?: string,
  recipientPhone?: string
): MFSRequestResult {
  const safeAmount = Math.max(0, Math.round(Number(amount) || 0));
  const safeNumber = (managerNumber || '').trim();
  const safeReason = (reason || 'Expense Split').trim();

  // Exactly matches required specification:
  // "Hey! Your share for [Reason] is [Amount] BDT. Please Send Money to my personal [bKash/Nagad] number: [Manager Number]. Thank you!"
  const greeting = recipientName ? `Hey ${recipientName}!` : 'Hey!';
  const message = `${greeting} Your share for ${safeReason} is ${safeAmount.toLocaleString('en-BD')} BDT. Please Send Money to my personal ${platform} number: ${safeNumber}. Thank you!`;

  const encodedMessage = encodeURIComponent(message);

  let waPhone = '';
  if (recipientPhone) {
    const digitsOnly = recipientPhone.replace(/\D/g, '');
    if (digitsOnly.startsWith('880')) {
      waPhone = digitsOnly;
    } else if (digitsOnly.startsWith('0')) {
      waPhone = `88${digitsOnly}`;
    } else if (digitsOnly.length === 10) {
      waPhone = `880${digitsOnly}`;
    } else {
      waPhone = digitsOnly;
    }
  }

  const whatsappUrl = waPhone
    ? `https://wa.me/${waPhone}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;

  const messengerUrl = `https://m.me/?text=${encodedMessage}`;

  const smsUrl = recipientPhone
    ? `sms:${recipientPhone}?body=${encodedMessage}`
    : `sms:?body=${encodedMessage}`;

  const isNativeShareAvailable =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return {
    message,
    whatsappUrl,
    smsUrl,
    messengerUrl,
    isNativeShareAvailable,
  };
}

/**
 * Trigger native browser or mobile OS share sheet
 */
export async function triggerNativeShare(
  title: string,
  text: string
): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
      });
      return true;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Native share failed:', err);
      }
      return false;
    }
  }
  return false;
}

/**
 * Copy payment request text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    return false;
  }
}

/**
 * MFS Brand Config helper
 */
export const MFS_CONFIG: Record<
  MFSPlatform,
  {
    name: string;
    bengaliName: string;
    color: string;
    bgHover: string;
    ussdCode: string;
    badgeClass: string;
  }
> = {
  bKash: {
    name: 'bKash',
    bengaliName: 'বিকাশ',
    color: '#E2136E',
    bgHover: 'hover:bg-[#C70059]',
    ussdCode: '*247#',
    badgeClass: 'bg-fintech-bkash/10 text-fintech-bkash border-fintech-bkash/30',
  },
  Nagad: {
    name: 'Nagad',
    bengaliName: 'নগদ',
    color: '#F7941E',
    bgHover: 'hover:bg-[#E07D0C]',
    ussdCode: '*167#',
    badgeClass: 'bg-fintech-nagad/10 text-fintech-nagad border-fintech-nagad/30',
  },
  Rocket: {
    name: 'Rocket',
    bengaliName: 'রকেট',
    color: '#8C3494',
    bgHover: 'hover:bg-[#722579]',
    ussdCode: '*322#',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  Upay: {
    name: 'Upay',
    bengaliName: 'উপায়',
    color: '#0066B2',
    bgHover: 'hover:bg-[#00508F]',
    ussdCode: '*268#',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
};
