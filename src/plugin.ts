import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { BusyLightControl } from "./actions/busy-light-control";

streamDeck.logger.setLevel(LogLevel.DEBUG);

streamDeck.actions.registerAction(new BusyLightControl());

streamDeck.connect();
