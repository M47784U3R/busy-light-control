import { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import * as PImage from 'pureimage';
import { PassThrough } from 'stream';

/**
 * Toggles the busy light when pressing the button. Long press switches the busy light off/on.
 */
@action({ UUID: "dev.ministryofcode.busy-light-control" })
export class BusyLightCrontrol extends SingletonAction<BusyLightCrontrolSettings> {
	/**
	 * The {@link SingletonAction.onWillAppear} event is useful for setting the visual representation of an action when it becomes visible. This could be due to the Stream Deck first
	 * starting up, or the user navigating between pages / folders etc.. There is also an inverse of this event in the form of {@link streamDeck.client.onWillDisappear}. In this example,
	 * we're setting the title to the "count" that is incremented in {@link IncrementCounter.onKeyDown}.
	 */
	override async onWillAppear(ev: WillAppearEvent<BusyLightCrontrolSettings>): Promise<void> {
		ev.payload.settings.colorAvailable = {red: 0, green: 255, blue: 0};
		ev.payload.settings.colorBusy = {red: 255, green: 0, blue: 0};

		let settings = ev.payload.settings;

		let apiOn = false;
		try {
			if (settings.host 
				&& settings.endpointStatus
				&& settings.endpointSwitch
				&& settings.endpointOn
				&& settings.endpointOff
			) {						
					const statusResponse = await fetch(settings.host + settings.endpointStatus, {
					method: 'GET',
					headers: { 'Content-Type': 'application/json' }
				});

				const apiStatus: StatusResponse = await statusResponse.json() as StatusResponse;
				apiOn = statusResponse.status === 200;

				if (apiOn === true) {
					var targetColor = new BusyLightColor({ red: 0, green: 255, blue: 0 })				
					const secondResponse = await fetch(settings.host + settings.endpointSwitch, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(targetColor)
					});
		
					const secondData = await secondResponse.json();
					const base64Image = await createBase64Image(targetColor);
					await ev.action.setImage(`data:image/png;base64,${base64Image}`);
				}
			}
		} catch (error) {
			console.error('Fehler bei den Requests:', error);
		}
	return ev.action.setTitle(`${ev.payload.settings.host ?? 'no host'}`);
	}

	/**
	 * Listens for the {@link SingletonAction.onKeyDown} event which is emitted by Stream Deck when an action is pressed. Stream Deck provides various events for tracking interaction
	 * with devices including key down/up, dial rotations, and device connectivity, etc. When triggered, {@link ev} object contains information about the event including any payloads
	 * and action information where applicable. In this example, our action will display a counter that increments by one each press. We track the current count on the action's persisted
	 * settings using `setSettings` and `getSettings`.
	 */
	override async onKeyDown(ev: KeyDownEvent<BusyLightCrontrolSettings>): Promise<void> {
		// Update the count from the settings.
		const { settings } = ev.payload;
		handleButtonPress(settings, ev);

		// Update the current count in the action's settings, and change the title.
		await ev.action.setSettings(settings);
	}
}

async function handleButtonPress(settings: BusyLightCrontrolSettings, ev: KeyDownEvent<BusyLightCrontrolSettings>) {
	let apiOn = false;
    try {
        if (settings.host 
			&& settings.endpointStatus
			&& settings.endpointSwitch
			&& settings.endpointOn
			&& settings.endpointOff
		) {						
			const statusResponse = await fetch(settings.host + settings.endpointStatus, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        const apiStatus: StatusResponse = await statusResponse.json() as StatusResponse;
		apiOn = statusResponse.status === 200;

        if (apiOn === true) {
			let color = new BusyLightColor({ red: apiStatus?.red, green: apiStatus?.green, blue: apiStatus?.blue })
			if (color.red === 255) {
				var targetColor = new BusyLightColor({ red: 0, green: 255, blue: 0 })
			} else {
				var targetColor = new BusyLightColor({ red: 255, green: 0, blue: 0 })
			}
			const secondResponse = await fetch(settings.host + settings.endpointSwitch, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(targetColor)
			});
 
			const secondData = await secondResponse.json();
			const base64Image = await createBase64Image(targetColor);
			await ev.action.setImage(`data:image/png;base64,${base64Image}`);

			} else {
				if (settings.host === undefined) {
					return errorCodes.hostNotSet;
				}
				if (settings.endpointStatus === undefined) {
					return errorCodes.endpointStatusNotSet;
				}
				if (settings.endpointSwitch === undefined) {
					return errorCodes.endpointSwitchNotSet;
				}
				if (settings.endpointOn === undefined) {
					return errorCodes.endpointOnNotSet;
				}
				if (settings.endpointOff === undefined) {
					return errorCodes.endpointOffNotSet;
				}
			}
		}
    } catch (error) {
        console.error('Fehler bei den Requests:', error);
		return errorCodes.unknownError;
    }	
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
    stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer.toString('base64'));
    });

    stream.on('error', reject);

    PImage.encodePNGToStream(img, stream).catch(reject);
  });
}

/**
 * Settings for {@link BusyLightCrontrol}.
 */
type BusyLightCrontrolSettings = {
	host?: string;
	endpointStatus?: string;
	endpointSwitch?: string;	
	endpointOn?: string;
	endpointOff?: string;
	colorAvailable: {
		red: number,
		green: number,
		blue: number
	};
	colorBusy: {
		red: number,
		green: number,
		blue: number
	};
};

class BusyLightColor {
  red: number;
  green: number;
  blue: number;

  constructor(input: Partial<BusyLightColor>) {
    this.red = input.red ?? 0;
    this.green = input.green ?? 0;
    this.blue = input.blue ?? 0;
  }
}

const errorCodes = {
	hostNotSet: 100,
	hostNotResponding: 200,
	endpointStatusNotSet: 300,
	endpointSwitchNotSet: 400,
	endpointOnNotSet: 500,
	endpointOffNotSet: 600,
	unknownError: 700,
}

type StatusResponse = {
  status: 'on' | 'off';
  red?: number;
  green?: number;
  blue?: number;
};