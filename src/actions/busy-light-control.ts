import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import * as PImage from 'pureimage';
import { PassThrough } from 'stream';

@action({ UUID: "dev.ministryofcode.busy-light-control" })
export class BusyLightControl extends SingletonAction<BusyLightControlSettings> {
  override async onWillAppear(ev: WillAppearEvent<BusyLightControlSettings>): Promise<void> {
    const { settings } = ev.payload;
    
    settings.colorAvailable = COLORS.available;
    settings.colorBusy = COLORS.busy;

    if (!areSettingsValid(settings)) {
      await ev.action.setTitle('Invalid settings');
      streamDeck.logger.info('Invalid settings');
      return;
    }

    await ev.action.setTitle(settings.host ?? 'no host');

    try {
      const status = await fetchStatus(settings.host!, settings.endpointStatus!);
      if (status) {
        const targetColor = COLORS.available;
        await switchColor(settings, targetColor);
        const base64Image = await createBase64Image(targetColor);
        await ev.action.setImage(`data:image/png;base64,${base64Image}`);
        await ev.action.setTitle('Available');
      }
    } catch (err) {
      streamDeck.logger.error('Error in onWillAppear: ' + JSON.stringify(err));
      console.error("Error in onWillAppear:", err);
    }
  }

  override async onKeyDown(ev: KeyDownEvent<BusyLightControlSettings>): Promise<void> {
    const { settings } = ev.payload;
    streamDeck.logger.debug('Button pressed');
    await handleButtonPress(settings, ev);
    await ev.action.setSettings(settings);
  }
}

async function handleButtonPress(settings: BusyLightControlSettings, ev: KeyDownEvent<BusyLightControlSettings>): Promise<void> {
  streamDeck.logger.debug('Validating settings');
  if (!areSettingsValid(settings)) return;
  try {
    const status = await fetchStatus(settings.host!, settings.endpointStatus!);
    if (!status) return;

    const isBusy = status.red === 255;
    const targetColor = isBusy ? COLORS.available : COLORS.busy;

    await switchColor(settings, targetColor);
    const base64Image = await createBase64Image(targetColor);
    await ev.action.setImage(`data:image/png;base64,${base64Image}`);
    await ev.action.setTitle(isBusy ? 'Available' : 'Busy');
  } catch (error) {
    streamDeck.logger.error('Error in handleButtonPress: ' + JSON.stringify(error));
    console.error('Error in handleButtonPress:', error);
  }
}

function areSettingsValid(settings: BusyLightControlSettings): boolean {
  return !!(settings.host && settings.endpointStatus && settings.endpointSwitch && settings.endpointOn && settings.endpointOff);
}

async function fetchStatus(host: string, endpoint: string): Promise<StatusResponse | null> {
  streamDeck.logger.debug('Fetching status from ' + host + endpoint);
  const res = await fetch(`${host}${endpoint}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return !res.ok ? null : await res.json() as StatusResponse;
}

async function switchColor(settings: BusyLightControlSettings, color: BusyLightColor): Promise<void> {
  streamDeck.logger.debug('Switching colour to ' + JSON.stringify(color) + ' using ' + settings.host! + settings.endpointSwitch!);
  await fetch(settings.host! + settings.endpointSwitch!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(color),
  });
}

async function createBase64Image(color: BusyLightColor, width = 100, height = 100): Promise<string> {
  const img = PImage.make(width, height);
  const ctx = img.getContext('2d');

  ctx.fillStyle = `rgb(${color.red}, ${color.green}, ${color.blue})`;
  ctx.fillRect(0, 0, width, height);

  const stream = new PassThrough();
  const chunks: Buffer[] = [];

  stream.on('data', chunk => chunks.push(chunk));

  return new Promise((resolve, reject) => {
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
    stream.on('error', reject);
    PImage.encodePNGToStream(img, stream).catch(reject);
  });
}

class BusyLightColor {
  constructor(public red = 0, public green = 0, public blue = 0) {}
}

type RGBColor = {
  red: number;
  green: number;
  blue: number;
};

type BusyLightControlSettings = {
  host?: string;
  endpointStatus?: string;
  endpointSwitch?: string;
  endpointOn?: string;
  endpointOff?: string;
  colorAvailable: RGBColor;
  colorBusy: RGBColor;
};

type StatusResponse = {
  status: 'on' | 'off';
  red?: number;
  green?: number;
  blue?: number;
};

const COLORS = {
  available: new BusyLightColor(0, 255, 0),
  busy: new BusyLightColor(255, 0, 0),
};